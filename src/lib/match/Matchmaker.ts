import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Emitter } from "@/lib/events/Emitter";

export interface Partner {
  name: string;
  country: string | null;
}

export interface MatchInfo {
  matchId: string;
  initiator: boolean;
  partner: Partner;
}

type RpcResult =
  | { status: "waiting" }
  | { status: "requeue" }
  | { status: "matched"; match_id: string; initiator: boolean; partner: Partner };

export type MatchmakerEvents = {
  matched: MatchInfo;
  error: Error;
};

/**
 * Talks to the matchmaking functions in Postgres.
 * - search(): join queue or get matched instantly
 * - while waiting: instant notify via Realtime postgres_changes, plus a slow
 *   poll that doubles as a heartbeat (so closed tabs drop out of the queue).
 */
export class Matchmaker {
  readonly events = new Emitter<MatchmakerEvents>();
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private notifyChannel: RealtimeChannel | null = null;
  /** Bumped on every search/cancel so late responses from old searches are ignored. */
  private generation = 0;
  private country: string | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly selfId: string,
    private readonly pollMs = 4000,
  ) {}

  async search(country: string | null): Promise<void> {
    this.country = country;
    const gen = ++this.generation;
    this.stopWaiting();
    const { data, error } = await this.supabase.rpc("find_match", { p_country: country });
    if (gen !== this.generation) return;
    if (error) return this.events.emit("error", new Error(error.message));
    this.handle(data as RpcResult, gen);
  }

  /** Stop searching (Stop button / leaving page). */
  async cancel(): Promise<void> {
    this.generation++;
    this.stopWaiting();
    await this.supabase.rpc("leave_queue");
  }

  async endMatch(matchId: string): Promise<void> {
    await this.supabase.rpc("end_match", { p_match_id: matchId });
  }

  dispose(): void {
    this.generation++;
    this.stopWaiting();
    this.events.clear();
  }

  // ---------------------------------------------------------------------------

  private handle(result: RpcResult, gen: number) {
    if (gen !== this.generation) return;
    switch (result.status) {
      case "matched":
        this.stopWaiting();
        this.generation++; // ignore any in-flight poll for this search
        this.events.emit("matched", {
          matchId: result.match_id,
          initiator: result.initiator,
          partner: result.partner,
        });
        break;
      case "waiting":
        this.startWaiting(gen);
        break;
      case "requeue":
        void this.search(this.country);
        break;
    }
  }

  private startWaiting(gen: number) {
    if (this.pollTimer) return;
    const poll = async () => {
      const { data, error } = await this.supabase.rpc("queue_poll");
      if (gen !== this.generation) return;
      if (error) return this.events.emit("error", new Error(error.message));
      this.handle(data as RpcResult, gen);
    };
    this.pollTimer = setInterval(() => void poll(), this.pollMs);

    // Instant path: someone inserted a match where I'm the waiter.
    this.notifyChannel = this.supabase
      .channel(`waiter:${this.selfId}:${gen}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_a=eq.${this.selfId}` },
        () => void poll(),
      )
      .subscribe();
  }

  private stopWaiting() {
    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
    if (this.notifyChannel) {
      void this.supabase.removeChannel(this.notifyChannel);
      this.notifyChannel = null;
    }
  }
}
