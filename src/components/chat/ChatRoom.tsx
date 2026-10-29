"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useChatSession } from "@/hooks/useChatSession";
import { useIceConfig } from "@/hooks/useIceConfig";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { unlockAudio, useMatchAlert } from "@/hooks/useMatchAlert";
import { getSupabase } from "@/lib/supabase/client";
import { siteConfig } from "@/config/site";
import { countryFlag, countryName } from "@/lib/countries";
import { ChatPanel } from "./ChatPanel";
import { ReportDialog } from "./ReportDialog";
import { VideoTile } from "./VideoTile";

export function ChatRoom({ session, isAdmin }: { session: Session; isAdmin: boolean }) {
  const media = useLocalMedia();
  const { iceServers, country } = useIceConfig(session.access_token);
  const { state, remoteStream, start, next, stop, sendChat, report } = useChatSession({
    supabase: getSupabase(),
    userId: session.user.id,
    accessToken: session.access_token,
    localStream: media.stream,
    iceServers,
    country,
  });
  const [reportOpen, setReportOpen] = useState(false);
  const { request } = media;
  useMatchAlert(state.phase);
  const begin = () => {
    unlockAudio();
    start();
  };

  useEffect(() => {
    void request();
  }, [request]);

  // Esc = Next (the classic shortcut), unless typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || reportOpen) return;
      if (state.phase === "idle") begin();
      else if (state.phase !== "banned") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, reportOpen, start, state.phase]);

  if (state.phase === "banned") return <BannedScreen />;

  const inCall = state.phase === "connecting" || state.phase === "connected";
  const running = state.phase !== "idle";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-2.5 md:px-6">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-4 text-sm text-haze">
          {isAdmin && (
            <Link href="/admin" className="hover:text-mist">
              Admin
            </Link>
          )}
          {session.user.is_anonymous ? (
            <Link href="/" className="hover:text-mist">
              Leave
            </Link>
          ) : (
            <button onClick={() => getSupabase().auth.signOut()} className="hover:text-mist">
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,auto)] gap-3 px-3 pb-3 md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-1 md:px-6 md:pb-6">
        {/* Video stage */}
        <section className="relative min-h-[46dvh] overflow-hidden rounded-3xl bg-plum-deep md:min-h-0" aria-label="Video">
          <VideoTile stream={remoteStream} label="Stranger's video" className="absolute inset-0">
            <StageOverlay phase={state.phase} notice={state.error ? "Having trouble reaching the server. Retrying…" : state.notice} hasRemote={!!remoteStream} />
          </VideoTile>

          {state.partner && inCall && (
            <div className="absolute left-3 top-3 rounded-full bg-plum-deep/70 px-3 py-1 text-sm backdrop-blur">
              {countryFlag(state.partner.country)} {state.partner.name === "Stranger" ? (countryName(state.partner.country) ?? "Stranger") : state.partner.name}
              {state.phase === "connected" && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-signal" />}
            </div>
          )}

          {/* Self view, picture-in-picture */}
          <VideoTile
            stream={media.stream}
            muted
            mirrored
            label="Your camera"
            className="absolute bottom-3 right-3 aspect-[3/4] w-[28%] max-w-[180px] rounded-2xl border-2 border-dusk-2 shadow-xl md:aspect-video md:w-[24%] md:max-w-[260px]"
          >
            {media.status !== "ready" && (
              <div className="absolute inset-0 grid place-items-center p-2 text-center text-xs text-haze">
                {media.status === "denied"
                  ? "Camera blocked. Allow it in your browser's address bar."
                  : media.status === "unavailable"
                    ? "No camera found"
                    : "Starting camera…"}
              </div>
            )}
            {media.status === "ready" && !media.camOn && (
              <div className="absolute inset-0 grid place-items-center bg-plum-deep text-xs text-haze">Camera off</div>
            )}
          </VideoTile>
        </section>

        {/* Controls + chat */}
        <aside className="flex min-h-[220px] flex-col overflow-hidden rounded-3xl bg-dusk md:min-h-0">
          <div className="grid grid-cols-[1fr_auto] gap-2 p-3">
            {running ? (
              <button
                onClick={next}
                className="rounded-2xl bg-coral py-3.5 font-display text-xl font-bold text-plum-deep transition-colors hover:bg-coral-hot active:scale-[0.99]"
              >
                Next <span className="text-sm font-medium opacity-70">Esc</span>
              </button>
            ) : (
              <button
                onClick={begin}
                disabled={media.status === "requesting"}
                className="rounded-2xl bg-coral py-3.5 font-display text-xl font-bold text-plum-deep transition-colors hover:bg-coral-hot disabled:opacity-60"
              >
                Start
              </button>
            )}
            <button
              onClick={stop}
              disabled={!running}
              className="rounded-2xl bg-dusk-2 px-5 font-semibold disabled:opacity-40"
            >
              Stop
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 pb-2 text-sm">
            <ToggleButton on={media.micOn} onClick={media.toggleMic} labelOn="Mute" labelOff="Unmute" />
            <ToggleButton on={media.camOn} onClick={media.toggleCam} labelOn="Camera off" labelOff="Camera on" />
            <button
              onClick={() => setReportOpen(true)}
              disabled={!inCall}
              className="ml-auto rounded-full px-3 py-1.5 text-haze hover:bg-dusk-2 hover:text-coral disabled:opacity-30"
            >
              Report
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-white/5">
            <ChatPanel lines={state.lines} enabled={state.phase === "connected"} onSend={sendChat} />
          </div>
        </aside>
      </main>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={report} />
    </div>
  );
}

const QUIET_AFTER_MS = 20_000;

function StageOverlay({ phase, notice, hasRemote }: { phase: string; notice: string | null; hasRemote: boolean }) {
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    if (phase !== "searching") return;
    const t = setTimeout(() => setQuiet(true), QUIET_AFTER_MS);
    return () => {
      clearTimeout(t);
      setQuiet(false);
    };
  }, [phase]);

  if (phase === "connected" && hasRemote) return null;
  return (
    <div className="absolute inset-0 grid place-items-center p-6 text-center">
      {phase === "idle" && (
        <div className="max-w-xs">
          <p className="font-display text-3xl font-bold">Ready when you are</p>
          <p className="mt-2 text-haze">Press Start to meet someone new. Press Next anytime to skip.</p>
        </div>
      )}
      {(phase === "searching" || phase === "connecting" || (phase === "connected" && !hasRemote)) && (
        <div>
          <div className="ripple relative mx-auto h-16 w-16 rounded-full bg-coral/20" />
          <p className="mt-8 font-display text-2xl font-bold">
            {phase === "searching" ? "Looking for a stranger…" : "Connecting…"}
          </p>
          {notice && !quiet && <p className="mt-2 text-sm text-haze">{notice}</p>}
          {quiet && phase === "searching" && <QuietRoom />}
        </div>
      )}
    </div>
  );
}

/** Shown after ~20s of waiting: honest, and turns waiting into inviting. */
function QuietRoom() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title: siteConfig.name, text: "Come video chat with me on " + siteConfig.name, url: siteConfig.url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(siteConfig.url);
        setCopied(true);
      }
    } catch {
      /* share sheet dismissed */
    }
  };
  return (
    <div className="mx-auto mt-3 max-w-xs">
      <p className="text-sm text-haze">
        It&apos;s quiet right now. Keep this tab open: you&apos;ll hear a chime and see the tab flash when someone joins.
      </p>
      <button onClick={share} className="mt-4 rounded-full bg-dusk-2 px-5 py-2 font-semibold hover:bg-signal hover:text-plum-deep">
        {copied ? "Link copied" : "Bring a friend in"}
      </button>
    </div>
  );
}

function ToggleButton({ on, onClick, labelOn, labelOff }: { on: boolean; onClick: () => void; labelOn: string; labelOff: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={!on}
      className={`rounded-full px-3 py-1.5 ${on ? "bg-dusk-2 hover:bg-dusk-2/70" : "bg-coral/20 text-coral"}`}
    >
      {on ? labelOn : labelOff}
    </button>
  );
}

function BannedScreen() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-4xl font-bold">Your account is suspended</h1>
        <p className="mt-3 text-haze">
          Several people reported this account for breaking our{" "}
          <Link href="/guidelines" className="text-signal underline">
            community guidelines
          </Link>
          . If you think this is a mistake, email {siteConfig.contactEmail}.
        </p>
      </div>
    </div>
  );
}
