"use client";

import { useEffect, useRef } from "react";
import type { ChatPhase } from "@/lib/chat/chatMachine";

/**
 * When the tab is in the background and someone is found, play a short chime
 * and flash the tab title. Lets people wait for a match while doing other things
 * (vital while the user base is small).
 */
export function useMatchAlert(phase: ChatPhase) {
  const prev = useRef<ChatPhase>(phase);

  useEffect(() => {
    const was = prev.current;
    prev.current = phase;
    if (!(was === "searching" && phase === "connecting")) return;
    if (typeof document === "undefined" || !document.hidden) return;

    chime();
    const original = document.title;
    let on = false;
    const timer = setInterval(() => {
      on = !on;
      document.title = on ? "👋 Someone's here!" : original;
    }, 900);
    const stop = () => {
      if (document.hidden) return;
      clearInterval(timer);
      document.title = original;
      document.removeEventListener("visibilitychange", stop);
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      clearInterval(timer);
      document.title = original;
      document.removeEventListener("visibilitychange", stop);
    };
  }, [phase]);
}

let audioCtx: AudioContext | null = null;

/** Call from a click handler (e.g. Start) so browsers allow the chime later. */
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx ??= new Ctx();
    void audioCtx.resume();
  } catch {
    /* no audio support */
  }
}

function chime() {
  try {
    const ctx = audioCtx;
    if (!ctx) return;
    void ctx.resume();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  } catch {
    /* audio blocked — title flash still works */
  }
}
