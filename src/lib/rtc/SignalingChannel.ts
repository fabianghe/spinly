import type { Emitter } from "@/lib/events/Emitter";

export type SignalMessage =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "bye" };

export type SignalingEvents = {
  message: SignalMessage;
  /** The other peer is present on the channel and can receive messages. */
  peerJoined: void;
  peerLeft: void;
};

/**
 * Transport for WebRTC handshake messages between exactly two peers.
 * PeerSession depends on this abstraction, not on Supabase, so the
 * transport can be swapped (tests use an in-memory loopback).
 */
export interface SignalingChannel {
  readonly events: Emitter<SignalingEvents>;
  connect(): Promise<void>;
  send(message: SignalMessage): void;
  close(): void;
}
