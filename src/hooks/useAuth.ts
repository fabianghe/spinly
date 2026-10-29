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

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(() => (isSupabaseConfigured() ? "loading" : "unconfigured"));
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, role, banned, age_confirmed_at")
        .eq("id", s.user.id)
        .single();
      setProfile((data as Profile) ?? null);
      setStatus("signed-in");
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
    await supabase.rpc("confirm_age");
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, display_name, role, banned, age_confirmed_at")
      .eq("id", data.session.user.id)
      .single();
    setSession(data.session);
    setProfile((prof as Profile) ?? null);
    setStatus("signed-in");
    return null;
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

  return { status, session, profile, signInWithGoogle, signInAsGuest, signInWithPassword, signOut, confirmAge };
}
