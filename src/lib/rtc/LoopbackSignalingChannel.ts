import { Emitter } from "@/lib/events/Emitter";
import type { SignalMessage, SignalingChannel, SignalingEvents } from "./SignalingChannel";

/** In-memory pair of channels. Used by the dev self-test page. */
export class LoopbackSignalingChannel implements SignalingChannel {
  readonly events = new Emitter<SignalingEvents>();
  private other: LoopbackSignalingChannel | null = null;
  private connected = false;

  static pair(): [LoopbackSignalingChannel, LoopbackSignalingChannel] {
    const a = new LoopbackSignalingChannel();
    const b = new LoopbackSignalingChannel();
    a.other = b;
    b.other = a;
    return [a, b];
  }

  async connect(): Promise<void> {
    this.connected = true;
    if (this.other?.connected) {
      this.events.emit("peerJoined");
      this.other.events.emit("peerJoined");
    }
  }

  send(message: SignalMessage): void {
    const target = this.other;
    // Async + JSON round-trip to mimic a real network transport.
    const copy = JSON.parse(JSON.stringify(message)) as SignalMessage;
    setTimeout(() => target?.events.emit("message", copy), 5);
  }

  close(): void {
    this.connected = false;
    this.other?.events.emit("peerLeft");
    this.events.clear();
  }
}
