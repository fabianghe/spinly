"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { googleEnabled, guestsAllowed, siteConfig } from "@/config/site";
import { ChatRoom } from "./ChatRoom";

/** Gatekeeper: sign-in → 18+ confirmation → chat room. */
export function ChatApp() {
  const { status, session, profile, dbError, reset, signInWithGoogle, signInAsGuest, confirmAge } = useAuth();

  if (status === "unconfigured") return <Centered title="Almost there">Add your Supabase keys to the environment variables (see README) and redeploy.</Centered>;
  if (status === "loading") return <Centered title="Loading…" />;
  if (status === "db-error") return <DbError message={dbError} onReset={reset} />;
  if (status === "signed-out" || !session)
    return guestsAllowed ? (
      <GuestStart onStart={signInAsGuest} onGoogle={googleEnabled ? () => signInWithGoogle("/chat") : undefined} />
    ) : (
      <SignIn onGoogle={() => signInWithGoogle("/chat")} />
    );
  if (!profile) return <Centered title="Setting up your account…">Refresh the page if this takes more than a few seconds.</Centered>;
  if (!profile.age_confirmed_at) return <AgeGate onConfirm={confirmAge} />;

  return <ChatRoom session={session} isAdmin={profile.role === "admin"} />;
}

/** No-account entry: one checkbox, one button. */
function GuestStart({ onStart, onGoogle }: { onStart: () => Promise<string | null>; onGoogle?: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-2xl font-extrabold">
          {siteConfig.name}
        </Link>
        <h1 className="mt-10 font-display text-4xl font-bold leading-tight">Meet someone new</h1>
        <p className="mt-3 text-haze">No account needed. Strangers only see your country.</p>

        <label className="mt-8 flex gap-3 rounded-2xl bg-dusk p-4 text-left">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-coral" />
          <span className="text-sm">
            I&apos;m {siteConfig.minAge} or older and agree to the{" "}
            <Link href="/guidelines" target="_blank" className="text-signal underline">
              guidelines
            </Link>
            ,{" "}
            <Link href="/terms" target="_blank" className="underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="underline">
              privacy policy
            </Link>
            . No nudity, no harassment, no spam.
          </span>
        </label>

        <button
          disabled={!agreed || busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const err = await onStart();
            if (err) {
              setError(err);
              setBusy(false);
            }
          }}
          className="mt-4 w-full rounded-2xl bg-coral py-4 font-display text-2xl font-bold text-plum-deep hover:bg-coral-hot disabled:opacity-40"
        >
          {busy ? "Starting…" : "Start"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-coral">
            {error}
          </p>
        )}

        {onGoogle && (
          <button onClick={onGoogle} disabled={!agreed} className="mt-4 text-sm text-haze underline hover:text-mist disabled:opacity-40">
            Or continue with Google
          </button>
        )}
      </div>
    </div>
  );
}

/** Shown when the database isn't set up correctly, with the actual error for the site owner. */
function DbError({ message, onReset }: { message: string | null; onReset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-3xl font-bold">We couldn&apos;t load your session</h1>
        <p className="mt-3 text-haze">Please try again in a moment.</p>
        <button onClick={onReset} className="mt-6 rounded-full bg-coral px-6 py-3 font-semibold text-plum-deep hover:bg-coral-hot">
          Start over
        </button>
        <details className="mt-8 text-left text-sm text-haze">
          <summary className="cursor-pointer">Details for the site owner</summary>
          <p className="mt-2">
            Database error: <code className="text-mist">{message ?? "unknown"}</code>
          </p>
          <p className="mt-2">
            Usually this means <code>supabase/schema.sql</code> hasn&apos;t been run (or only partly) in this Supabase
            project. Run the whole file in the SQL Editor, then press Start over.
          </p>
        </details>
      </div>
    </div>
  );
}

function Centered({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {children && <p className="mt-3 text-haze">{children}</p>}
      </div>
    </div>
  );
}

function SignIn({ onGoogle }: { onGoogle: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-2xl font-extrabold">
          {siteConfig.name}
        </Link>
        <h1 className="mt-10 font-display text-4xl font-bold leading-tight">Sign in to start chatting</h1>
        <p className="mt-3 text-haze">
          One tap with Google. Strangers only ever see your first name and country.
        </p>
        <button
          onClick={() => {
            setBusy(true);
            onGoogle();
          }}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-mist py-3.5 font-semibold text-plum-deep hover:bg-white disabled:opacity-70"
        >
          <GoogleMark />
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        <p className="mt-6 text-xs text-haze">
          By continuing you confirm you are {siteConfig.minAge}+ and agree to the{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function AgeGate({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [checked, setChecked] = useState(false);
  const [rules, setRules] = useState(false);
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-dusk p-8">
        <h1 className="font-display text-3xl font-bold">Before you start</h1>
        <p className="mt-2 text-haze">
          {siteConfig.name} is for adults only. Chats are live and unmoderated in real time, so please confirm:
        </p>
        <label className="mt-6 flex gap-3">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 accent-coral" />
          <span>I am {siteConfig.minAge} years or older.</span>
        </label>
        <label className="mt-3 flex gap-3">
          <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-1 accent-coral" />
          <span>
            I&apos;ll follow the{" "}
            <Link href="/guidelines" className="text-signal underline" target="_blank">
              community guidelines
            </Link>
            : no nudity, no harassment, no spam. Breaking them gets you banned.
          </span>
        </label>
        <button
          onClick={() => void onConfirm()}
          disabled={!checked || !rules}
          className="mt-8 w-full rounded-2xl bg-coral py-3.5 font-display text-xl font-bold text-plum-deep hover:bg-coral-hot disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
