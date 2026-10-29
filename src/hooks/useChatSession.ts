"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatReducer, initialChatState } from "@/lib/chat/chatMachine";
import { Matchmaker, type MatchInfo } from "@/lib/match/Matchmaker";
import { PeerSession } from "@/lib/rtc/PeerSession";
import { SupabaseSignalingChannel } from "@/lib/rtc/SupabaseSignalingChannel";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/client";

const HEARTBEAT_MS = 25_000;

const hasTurn = (servers: RTCIceServer[]) =>
  servers.some((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => u.startsWith("turn")));

export type ReportReason = "nudity" | "minor" | "harassment" | "spam" | "other";

interface Options {
  supabase: SupabaseClient;
  userId: string;
  accessToken: string | null;
  localStream: MediaStream | null;
  iceServers: RTCIceServer[];
  country: string | null;
}

/**
 * Orchestrates Matchmaker (who) + PeerSession (how) + chatReducer (what the UI shows).
 * React only sees state; all side effects live in the services.
 */
export function useChatSession({ supabase, userId, accessToken, localStream, iceServers, country }: Options) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const matchmaker = useRef<Matchmaker | null>(null);
  const peer = useRef<PeerSession | null>(null);
  const matchId = useRef<string | null>(null);
  const active = useRef(false); // true between Start and Stop

  // Latest values for callbacks without re-subscribing.
  const latest = useRef({ localStream, iceServers, country, accessToken });
  useEffect(() => {
    latest.current = { localStream, iceServers, country, accessToken };
  }, [localStream, iceServers, country, accessToken]);

  const teardownPeer = useCallback((notify: boolean) => {
    peer.current?.close(notify);
    peer.current = null;
    setRemoteStream(null);
    const id = matchId.current;
    matchId.current = null;
    if (id && notify) void matchmaker.current?.endMatch(id);
  }, []);

  const search = useCallback((notice?: string) => {
    dispatch({ type: "SEARCH", notice });
    void matchmaker.current?.search(latest.current.country);
  }, []);

  /** Partner went away on their own: auto-continue like Omegle/OmeTV. */
  const partnerGone = useCallback(
    (notice: string) => {
      teardownPeer(false);
      if (active.current) search(notice);
    },
    [search, teardownPeer],
  );

  const beginMatch = useCallback(
    (info: MatchInfo) => {
      if (!active.current) {
        void matchmaker.current?.endMatch(info.matchId);
        return;
      }
      teardownPeer(true);
      matchId.current = info.matchId;
      dispatch({ type: "MATCHED", matchId: info.matchId, partner: info.partner });

      const session = new PeerSession({
        signaling: new SupabaseSignalingChannel(supabase, info.matchId, userId),
        iceServers: latest.current.iceServers,
        localStream: latest.current.localStream,
        initiator: info.initiator,
        // Hide IPs from strangers by relaying everything through TURN (opt-in; uses relay bandwidth).
        iceTransportPolicy:
          process.env.NEXT_PUBLIC_FORCE_TURN_RELAY === "true" && hasTurn(latest.current.iceServers) ? "relay" : "all",
      });
      peer.current = session;

      session.events.on("remoteStream", setRemoteStream);
      session.events.on("chat", (text) => dispatch({ type: "LINE", from: "them", text }));
      session.events.on("bye", () => partnerGone("Stranger left. Finding someone new…"));
      session.events.on("state", (s) => {
        if (s === "connected") dispatch({ type: "CONNECTED" });
        if (s === "failed") partnerGone("Connection lost. Finding someone new…");
      });
      session.start().catch(() => partnerGone("Couldn't connect. Trying someone else…"));
    },
    [partnerGone, supabase, teardownPeer, userId],
  );

  // Matchmaker lifecycle.
  useEffect(() => {
    const mm = new Matchmaker(supabase, userId);
    matchmaker.current = mm;
    const offMatched = mm.events.on("matched", beginMatch);
    const offError = mm.events.on("error", (err) => {
      if (/banned/.test(err.message)) {
        active.current = false;
        teardownPeer(false);
        dispatch({ type: "BANNED" });
        return;
      }
      dispatch({ type: "ERROR", message: err.message });
      if (active.current) setTimeout(() => active.current && search(), 3000);
    });
    return () => {
      offMatched();
      offError();
      mm.dispose();
      matchmaker.current = null;
    };
  }, [beginMatch, search, supabase, teardownPeer, userId]);

  // Heartbeat: keeps you "online" for the admin panel + kicks you if banned.
  useEffect(() => {
    const beat = async () => {
      const { data } = await supabase.rpc("heartbeat");
      if (data === true) {
        active.current = false;
        teardownPeer(true);
        void matchmaker.current?.cancel();
        dispatch({ type: "BANNED" });
      }
    };
    void beat();
    const t = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [supabase, teardownPeer]);

  // Best-effort cleanup when the tab closes (keepalive survives unload).
  useEffect(() => {
    const onHide = () => {
      const token = latest.current.accessToken;
      if (!token || !active.current) return;
      const headers = { apikey: supabaseKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const id = matchId.current;
      if (id) {
        peer.current?.close(true);
        void fetch(`${supabaseUrl}/rest/v1/rpc/end_match`, {
          method: "POST",
          keepalive: true,
          headers,
          body: JSON.stringify({ p_match_id: id }),
        });
      } else {
        void fetch(`${supabaseUrl}/rest/v1/rpc/leave_queue`, { method: "POST", keepalive: true, headers, body: "{}" });
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  // Stop everything on unmount.
  useEffect(
    () => () => {
      if (active.current) {
        active.current = false;
        teardownPeer(true);
        void matchmaker.current?.cancel();
      }
    },
    [teardownPeer],
  );

  // ---- Public API -----------------------------------------------------------

  const start = useCallback(() => {
    active.current = true;
    search();
  }, [search]);

  const next = useCallback(() => {
    if (!active.current) return start();
    teardownPeer(true);
    search();
  }, [search, start, teardownPeer]);

  const stop = useCallback(() => {
    active.current = false;
    teardownPeer(true);
    void matchmaker.current?.cancel();
    dispatch({ type: "STOP" });
  }, [teardownPeer]);

  const sendChat = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (peer.current?.sendChat(clean)) dispatch({ type: "LINE", from: "me", text: clean });
  }, []);

  const report = useCallback(
    async (reason: ReportReason, details?: string) => {
      const id = matchId.current;
      if (!id) return;
      await supabase.rpc("report_user", { p_match_id: id, p_reason: reason, p_details: details ?? null });
      next();
    },
    [next, supabase],
  );

  return { state, remoteStream, start, next, stop, sendChat, report };
}
