"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  display_name: string;
  role: "user" | "admin";
  banned: boolean;
  age_confirmed_at: string | null;
}

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "unconfigured" | "db-error";

const PROFILE_COLUMNS = "id, display_name, role, banned, age_confirmed_at";

/** Load my profile; if it's missing, ask the database to create it, then retry once. */
async function fetchProfile(supabase: ReturnType<typeof getSupabase>, userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  const read = () => supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  let { data, error } = await read();
  if (!error && !data) {
    const { error: rpcError } = await supabase.rpc("ensure_profile");
    if (rpcError) return { profile: null, error: rpcError.message };
    ({ data, error } = await read());
  }
  if (error) return { profile: null, error: error.message };
  return { profile: (data as Profile) ?? null, error: data ? null : "Profile could not be created." };
}

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(() => (isSupabaseConfigured() ? "loading" : "unconfigured"));
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  /** While the guest flow runs, it owns state updates (avoids an age-gate flash). */
  const guestFlow = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();

    const load = async (s: Session | null) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setStatus("signed-out");
        return;
      }
      const { profile: p, error } = await fetchProfile(supabase, s.user.id);
      setProfile(p);
      setDbError(error);
      setStatus(error ? "db-error" : "signed-in");
    };

    void supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Token refreshes only need the new token, not a profile reload.
      if (event === "TOKEN_REFRESHED" || guestFlow.current) setSession(s);
      else if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (next = "/chat") => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  };

  /** No-account entry: anonymous Supabase user + 18+ confirmation in one step. */
  const signInAsGuest = async (): Promise<string | null> => {
    const supabase = getSupabase();
    guestFlow.current = true;
    try {
      const timeout = new Promise<string>((resolve) =>
        setTimeout(() => resolve("Couldn't reach the server. Check your connection and try again."), 12_000),
      );
      return await Promise.race([guestSignIn(supabase).catch((e: Error) => e.message || "Something went wrong."), timeout]);
    } finally {
      guestFlow.current = false;
    }
  };

  const guestSignIn = async (supabase: ReturnType<typeof getSupabase>): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      return /anonymous/i.test(error?.message ?? "")
        ? "Guest access is turned off. Enable “Allow anonymous sign-ins” in Supabase → Authentication."
        : /fetch|network/i.test(error?.message ?? "")
          ? "Couldn't reach the server. Check your connection and try again."
          : (error?.message ?? "Couldn't start a session. Try again.");
    }
    const first = await fetchProfile(supabase, data.session.user.id);
    if (first.error) {
      setSession(data.session);
      setDbError(first.error);
      setStatus("db-error");
      return null;
    }
    await supabase.rpc("confirm_age");
    const { profile: prof } = await fetchProfile(supabase, data.session.user.id);
    setSession(data.session);
    setProfile(prof);
    setStatus("signed-in");
    return null;
  };

  /** Secret admin code: becomes admin in this browser, no account needed. */
  const claimAdmin = async (code: string): Promise<string | null> => {
    const supabase = getSupabase();
    guestFlow.current = true;
    try {
      let current = session;
      if (!current) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.session) {
          return /anonymous/i.test(error?.message ?? "")
            ? "Enable “Allow anonymous sign-ins” in Supabase → Authentication first."
            : (error?.message ?? "Couldn't start a session.");
        }
        current = data.session;
      }
      const { data: ok, error } = await supabase.rpc("claim_admin", { p_code: code });
      if (error) {
        if (/too_many_attempts/.test(error.message)) return "Too many wrong tries. Wait an hour and try again.";
        if (/admin_code_not_set/.test(error.message)) return "No admin code set yet. Run set_admin_code in the Supabase SQL Editor.";
        if (/claim_admin|schema cache/.test(error.message)) return "Database is missing the latest schema. Re-run supabase/schema.sql.";
        return error.message;
      }
      if (ok !== true) return "Wrong code.";
      const { profile: p, error: pErr } = await fetchProfile(supabase, current.user.id);
      setSession(current);
      setProfile(p);
      setDbError(pErr);
      setStatus(pErr ? "db-error" : "signed-in");
      return null;
    } finally {
      guestFlow.current = false;
    }
  };

  /** Email + password, used for the admin account (created in the Supabase dashboard). */
  const signInWithPassword = async (email: string, password: string): Promise<string | null> => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
  };

  const confirmAge = async () => {
    await getSupabase().rpc("confirm_age");
    setProfile((p) => (p ? { ...p, age_confirmed_at: new Date().toISOString() } : p));
  };

  /** Throw away the current session and start fresh (used by the error screen). */
  const reset = async () => {
    await getSupabase().auth.signOut();
    window.location.reload();
  };

  return { status, session, profile, dbError, reset, claimAdmin, signInWithGoogle, signInAsGuest, signInWithPassword, signOut, confirmAge };
}
