"use client";

import { useEffect, useState } from "react";
import { PeerSession } from "@/lib/rtc/PeerSession";
import { LoopbackSignalingChannel } from "@/lib/rtc/LoopbackSignalingChannel";

export function LoopbackTest() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const push = (s: string) => setLog((l) => [...l, s]);
    const result: Record<string, unknown> = {};
    (window as unknown as { __result: typeof result }).__result = result;
    (async () => {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const [ca, cb] = LoopbackSignalingChannel.pair();
      const a = new PeerSession({ signaling: ca, iceServers: [], localStream: media, initiator: true });
      const b = new PeerSession({ signaling: cb, iceServers: [], localStream: media, initiator: false });
      a.events.on("state", (s) => { push("A " + s); result.aState = s; });
      b.events.on("state", (s) => { push("B " + s); result.bState = s; });
      b.events.on("remoteStream", (st) => { result.bTracks = st.getTracks().length; });
      a.events.on("remoteStream", (st) => { result.aTracks = st.getTracks().length; });
      b.events.on("chat", (t) => { result.bChat = t; push("B got: " + t); });
      a.events.on("bye", () => { result.aBye = true; });
      await Promise.all([a.start(), b.start()]);
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 50 && result.aState !== "connected"; i++) await wait(100);
      await wait(300);
      result.sent = a.sendChat("hello from A");
      await wait(500);
      b.close(true);
      await wait(400);
      result.done = true;
    })().catch((e) => { result.error = String(e); });
  }, []);
  return <pre className="p-6">{log.join("\n")}</pre>;
}
