"use client";

import { useEffect, useState } from "react";

const FALLBACK: RTCIceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

/** Fetches ICE servers (incl. short-lived TURN) + country once per visit. */
export function useIceConfig(accessToken: string | null) {
  const [iceServers, setIceServers] = useState<RTCIceServer[]>(FALLBACK);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch("/api/session", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((json: { iceServers?: RTCIceServer[]; country?: string | null }) => {
        if (cancelled) return;
        if (json.iceServers?.length) setIceServers(json.iceServers);
        setCountry(json.country ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only on first token; TURN creds last 4h, longer than any session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(accessToken)]);

  return { iceServers, country };
}
