import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Emitter } from "@/lib/events/Emitter";
import type { SignalMessage, SignalingChannel, SignalingEvents } from "./SignalingChannel";

/**
 * Signaling over a private-by-obscurity Supabase Realtime channel named after
 * the match id (a random UUID only the two participants know).
 * Broadcast carries SDP/ICE; Presence tells us when the partner is listening.
 */
export class SupabaseSignalingChannel implements SignalingChannel {
  readonly events = new Emitter<SignalingEvents>();
  private channel: RealtimeChannel | null = null;
  private peerPresent = false;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly matchId: string,
    private readonly selfId: string,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const channel = this.supabase.channel(`match:${this.matchId}`, {
        config: { broadcast: { self: false, ack: false }, presence: { key: this.selfId } },
      });
      this.channel = channel;

      channel
        .on("broadcast", { event: "signal" }, ({ payload }) => this.events.emit("message", payload as SignalMessage))
        .on("presence", { event: "sync" }, () => {
          const others = Object.keys(channel.presenceState()).filter((k) => k !== this.selfId);
          const present = others.length > 0;
          if (present && !this.peerPresent) this.events.emit("peerJoined");
          if (!present && this.peerPresent) this.events.emit("peerLeft");
          this.peerPresent = present;
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ at: Date.now() });
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(new Error(`signaling_${status.toLowerCase()}`));
          }
        });
    });
  }

  send(message: SignalMessage): void {
    void this.channel?.send({ type: "broadcast", event: "signal", payload: message });
  }

  close(): void {
    this.events.clear();
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
