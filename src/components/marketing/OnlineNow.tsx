import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";

/** Only show the live counter once it's big enough to be social proof. */
const SHOW_FROM = 25;

async function fetchOnline(): Promise<number | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase.rpc("online_count", {}, { get: true });
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  }
}

export async function OnlineNow() {
  const n = await fetchOnline();
  if (n === null || n < SHOW_FROM) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-haze">
      <span className="inline-block h-2 w-2 rounded-full bg-signal" />
      {n.toLocaleString("en-US")} people online now
    </p>
  );
}
