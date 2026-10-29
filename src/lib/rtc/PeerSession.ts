import { Emitter } from "@/lib/events/Emitter";
import type { SignalMessage, SignalingChannel } from "./SignalingChannel";

export type PeerState = "connecting" | "connected" | "failed" | "closed";

export type PeerSessionEvents = {
  state: PeerState;
  remoteStream: MediaStream;
  chat: string;
  /** Partner hung up on purpose (pressed Next/Stop). */
  bye: void;
};

export interface PeerSessionOptions {
  signaling: SignalingChannel;
  iceServers: RTCIceServer[];
  localStream: MediaStream | null;
  /** Exactly one side creates the offer. */
  initiator: boolean;
  connectTimeoutMs?: number;
  /** How long to gather ICE before sending the offer/answer in one message. */
  gatherWindowMs?: number;
  /** "relay" routes all media via TURN so peers never see each other's IP (costs TURN bandwidth). */
  iceTransportPolicy?: RTCIceTransportPolicy;
}

/**
 * One 1:1 WebRTC call. Owns the RTCPeerConnection + a text data channel.
 *
 * Bandwidth/cost note: we wait briefly for ICE gathering so most candidates
 * ride inside the SDP (≈4 signaling messages per call instead of ≈30), then
 * trickle any stragglers.
 */
export class PeerSession {
  readonly events = new Emitter<PeerSessionEvents>();
  private readonly pc: RTCPeerConnection;
  private readonly chatChannel: RTCDataChannel;
  private readonly unsubs: Array<() => void> = [];
  private remoteCandidates: RTCIceCandidateInit[] = [];
  private descriptionSent = false;
  private offered = false;
  private state: PeerState = "connecting";
  private connectTimer: ReturnType<typeof setTimeout> | undefined;
  private disconnectTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly opts: PeerSessionOptions) {
    this.pc = new RTCPeerConnection({ iceServers: opts.iceServers, iceTransportPolicy: opts.iceTransportPolicy ?? "all" });

    // Pre-negotiated channel: both sides create it with the same id, no extra round-trip.
    this.chatChannel = this.pc.createDataChannel("chat", { negotiated: true, id: 0 });
    this.chatChannel.onmessage = (e) => {
      if (typeof e.data === "string") this.events.emit("chat", e.data.slice(0, 1000));
    };

    opts.localStream?.getTracks().forEach((t) => this.pc.addTrack(t, opts.localStream!));
    if (!opts.localStream) {
      // Still receive video/audio even if we have no camera.
      this.pc.addTransceiver("video", { direction: "recvonly" });
      this.pc.addTransceiver("audio", { direction: "recvonly" });
    }

    this.pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      this.events.emit("remoteStream", stream);
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate && this.descriptionSent) {
        opts.signaling.send({ type: "ice", candidate: e.candidate.toJSON() });
      }
    };

    this.pc.onconnectionstatechange = () => this.handleConnectionState();
  }

  async start(): Promise<void> {
    const { signaling, initiator, connectTimeoutMs = 20_000 } = this.opts;
    this.unsubs.push(
      signaling.events.on("message", (m) => void this.handleSignal(m)),
      signaling.events.on("peerJoined", () => {
        if (initiator) void this.makeOffer();
      }),
      signaling.events.on("peerLeft", () => {
        // Their tab closed / network dropped. Give WebRTC a moment, it may still be alive.
        if (this.state !== "connected") this.setState("failed");
      }),
    );
    this.connectTimer = setTimeout(() => {
      if (this.state === "connecting") this.setState("failed");
    }, connectTimeoutMs);
    await signaling.connect();
  }

  sendChat(text: string): boolean {
    if (this.chatChannel.readyState !== "open") return false;
    this.chatChannel.send(text.slice(0, 1000));
    return true;
  }

  /** Hang up. `notify` tells the partner immediately instead of waiting for a timeout. */
  close(notify = true): void {
    if (this.state === "closed") return;
    if (notify) {
      try {
        this.opts.signaling.send({ type: "bye" });
      } catch {
        /* ignore */
      }
    }
    clearTimeout(this.connectTimer);
    clearTimeout(this.disconnectTimer);
    this.unsubs.forEach((u) => u());
    this.pc.getSenders().forEach((s) => {
      // Don't stop local tracks: the camera preview keeps running between calls.
      try {
        this.pc.removeTrack(s);
      } catch {
        /* ignore */
      }
    });
    this.pc.close();
    // Let the "bye" flush before the channel is torn down.
    setTimeout(() => this.opts.signaling.close(), 300);
    this.setState("closed");
    this.events.clear();
  }

  // ---------------------------------------------------------------------------

  private async makeOffer() {
    if (this.offered) return;
    this.offered = true;
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this.waitForGathering();
    this.sendDescription("offer");
  }

  private async handleSignal(msg: SignalMessage) {
    if (this.state === "closed") return;
    try {
      switch (msg.type) {
        case "offer": {
          if (this.opts.initiator) return; // glare guard: only one offerer
          await this.pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
          await this.flushRemoteCandidates();
          await this.pc.setLocalDescription(await this.pc.createAnswer());
          await this.waitForGathering();
          this.sendDescription("answer");
          break;
        }
        case "answer": {
          if (this.pc.signalingState !== "have-local-offer") return;
          await this.pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
          await this.flushRemoteCandidates();
          break;
        }
        case "ice": {
          if (this.pc.remoteDescription) await this.pc.addIceCandidate(msg.candidate);
          else this.remoteCandidates.push(msg.candidate);
          break;
        }
        case "bye": {
          this.events.emit("bye");
          break;
        }
      }
    } catch (err) {
      console.warn("[PeerSession] signal error", err);
    }
  }

  private sendDescription(type: "offer" | "answer") {
    const sdp = this.pc.localDescription?.sdp;
    if (!sdp) return;
    this.descriptionSent = true;
    this.opts.signaling.send({ type, sdp });
  }

  private async flushRemoteCandidates() {
    const pending = this.remoteCandidates;
    this.remoteCandidates = [];
    for (const c of pending) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {
        /* stale candidate */
      }
    }
  }

  private waitForGathering(): Promise<void> {
    const windowMs = this.opts.gatherWindowMs ?? 1500;
    if (this.pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      };
      const check = () => {
        if (this.pc.iceGatheringState === "complete") done();
      };
      const timer = setTimeout(done, windowMs);
      this.pc.addEventListener("icegatheringstatechange", check);
    });
  }

  private handleConnectionState() {
    switch (this.pc.connectionState) {
      case "connected":
        clearTimeout(this.connectTimer);
        clearTimeout(this.disconnectTimer);
        this.setState("connected");
        break;
      case "disconnected":
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = setTimeout(() => {
          if (this.pc.connectionState !== "connected") this.setState("failed");
        }, 5000);
        break;
      case "failed":
        this.setState("failed");
        break;
    }
  }

  private setState(next: PeerState) {
    if (this.state === next || this.state === "closed") return;
    this.state = next;
    this.events.emit("state", next);
  }
}
