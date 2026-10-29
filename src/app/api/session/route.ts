import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/session
 * Returns ICE servers (STUN for everyone, short-lived TURN only for signed-in,
 * non-banned users so strangers can't burn your relay bandwidth) + the
 * visitor's country from Vercel's edge headers.
 *
 * This is the only server code in the app. ~1 call per chat-page visit.
 */
const STUN: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

const TURN_TTL_SECONDS = 4 * 60 * 60;

type CfIceServer = { urls: string | string[]; username?: string; credential?: string };

async function getTurnServers(): Promise<RTCIceServer[]> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) return [];

  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("TURN credential error", res.status, await res.text());
    return [];
  }
  const json = (await res.json()) as { iceServers: CfIceServer[] | CfIceServer };
  const list = Array.isArray(json.iceServers) ? json.iceServers : [json.iceServers];

  // Browsers block port 53; drop those URLs.
  return list
    .map((s) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)),
    }))
    .filter((s) => s.urls.length > 0 && s.username) as RTCIceServer[];
}

async function isTrustedUser(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return false;
  const { data: banned } = await supabase.rpc("am_i_banned");
  return banned !== true;
}

export async function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country") ?? null;
  const trusted = await isTrustedUser(req).catch(() => false);
  const turn = trusted ? await getTurnServers().catch(() => []) : [];

  return NextResponse.json(
    { iceServers: [...STUN, ...turn], country, turn: turn.length > 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
