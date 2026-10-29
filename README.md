# Spinly: random video chat (OmeTV/Omegle-style)

Next.js on **Vercel**, with **Supabase** for login, database and realtime, and **Cloudflare** as the TURN relay.
Video is peer-to-peer (WebRTC), so it never touches your servers. Running cost is about **$0/month** until roughly 200 people are online at once.

> Rename the app in `src/config/site.ts` (or set `NEXT_PUBLIC_SITE_NAME`).

---

## Quick start: guest mode, no accounts (≈5 minutes)

By default people just press **Start**; there's no sign-up and no Google setup.

1. **Supabase:** create a free project at [supabase.com](https://supabase.com) (EU region, e.g. Frankfurt).
   - **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   - **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins** → Save.
   - **Project Settings → API**: copy the *Project URL* and the *publishable* (or *anon*) key.
2. **Vercel → your project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your live URL, e.g. `https://spinly.vercel.app`)

   Then **Deployments → ⋯ → Redeploy**. The `NEXT_PUBLIC_` values are baked in at build time, so a redeploy is required.
3. **Admin access (no account needed):** in the Supabase **SQL Editor**, choose a long secret phrase and run:
   ```sql
   select public.set_admin_code('your-long-secret-phrase');
   ```
   Open `/admin` on your site and enter it. That browser stays admin; repeat on any other device.
   - The code is stored only as a salted hash in your database, never in the repo.
   - After 5 wrong tries, that IP is locked out for an hour.
   - Running `set_admin_code` again with a new phrase signs out every device that used the old one.

That's it. Add the Cloudflare TURN relay (see below) soon after: without it, roughly 1 in 6 users on strict mobile or office networks can't connect.

Guest mode notes: bans also block the person's (hashed) IP for 7 days, so they can't just open a new tab. Supabase rate-limits anonymous sign-ins per IP, and you can add a CAPTCHA later (Authentication → Attack Protection).

---

## Optional: require Google sign-in (stronger bans)
Set `NEXT_PUBLIC_AUTH_MODE=google` (or `both` to offer it next to guest mode), then:

### 1. Supabase
As in the quick start.

### 2. Google sign-in
1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen** (External, app name, your email).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   *Authorized redirect URI:* `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Sign In / Providers → Google** → paste the Client ID + Secret → enable.
4. Supabase → **Authentication → URL Configuration**:
   - *Site URL:* `https://your-domain.com`
   - *Redirect URLs:* `https://your-domain.com/auth/callback` and `http://localhost:3000/auth/callback`

## Recommended: Cloudflare TURN relay (free up to 1,000 GB/month)
Without a relay, roughly 1 in 6 users (strict mobile networks or corporate firewalls) can't connect.
Cloudflare dashboard → **Realtime → TURN Server → Create**. Add the *Turn Token ID* and *API Token* to Vercel as `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`, then redeploy.

## Deploying from scratch (Vercel)
1. Push this folder to a GitHub repo → [vercel.com/new](https://vercel.com/new) → import it.
2. Add the environment variables from `.env.example` (at least the Supabase ones, `NEXT_PUBLIC_SITE_URL` and the two Cloudflare ones).
3. Deploy. Add your domain under **Settings → Domains**, then update `NEXT_PUBLIC_SITE_URL` and the Supabase URLs above to match.

## Admin access
Use the secret admin code (quick start step 3). Alternatively, create an email/password user in Supabase (**Authentication → Users → Add user**, *Auto Confirm*), or sign in once with Google, then in the **SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'your-admin@gmail.com';
```

Open `/admin`. The admin email lives only in your database, never in the code.
Turn on 2-step verification for that Google account.

## SEO: tell Google you exist
1. [Google Search Console](https://search.google.com/search-console) → add your domain (DNS verification, or set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`).
2. **Sitemaps** → submit `https://your-domain.com/sitemap.xml`.
3. Do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters) (you can import from Search Console).

---

## Hero photos (landing page)
Drop images into `public/hero/` and they appear automatically on the next deploy (silhouettes are used until then):
- `1-….webp` … `6-….webp`: the stranger reel, in file-name order. Each photo is paired with the country and chat line at the same position in `src/components/marketing/StrangerShuffle.tsx`.
- The included photos are AI-generated (the people don't exist), CC0 / public domain, from [faker-js/assets-person-portrait](https://github.com/faker-js/assets-person-portrait).
- `you.webp`: the small "You" window (optional).
- Portrait 4:5, about 800×1000, under 200 KB each (webp or jpg).

Use **AI-generated people** (no real person, so no consent issue) or stock photos that come with a **model release** (Adobe Stock, Shutterstock, Generated Photos commercial license). Free photo sites like Unsplash and Pexels don't include model releases, which is risky when the photo implies someone uses a stranger-chat app. Everyone shown should clearly be an adult (25+), fully clothed, and not resemble a celebrity.

## Run locally

```bash
cp .env.example .env.local   # fill in Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

To test a real call alone, open two browsers (e.g. Chrome + Chrome incognito) signed in with two Google accounts.
Dev-only self-tests: `/dev/loopback` (two-peer WebRTC call in one page) and `/dev/room` (chat UI preview).

---

## How it works

| Piece | Where | Notes |
|---|---|---|
| Matchmaking | Postgres function `find_match()` | FIFO queue, `FOR UPDATE SKIP LOCKED` = race-safe pairing |
| "You've been matched" | Supabase Realtime (`postgres_changes`) + a 4 s poll that doubles as a heartbeat | Closed tabs drop out of the queue after 15 s |
| WebRTC handshake | Supabase Realtime broadcast on `match:<uuid>` | Batched ICE → ~4 messages per call (keeps you inside the free 2M/month) |
| Video + audio + text | Peer-to-peer (WebRTC + data channel) | Never stored or relayed except via TURN when needed |
| Online status / admin live view | `heartbeat()` every 25 s | No realtime fan-out, so it scales cheaply |
| Moderation | `report_user()` | 5 unique reporters in 24 h (or 2 "looks under 18") = auto-ban; admin can reverse |
| Only server code | `/api/session` | Issues 4 h TURN credentials to signed-in users + reads country from Vercel |

Code map:

```
src/lib/rtc/PeerSession.ts            one 1:1 call (RTCPeerConnection + chat channel)
src/lib/rtc/SignalingChannel.ts       transport interface (Supabase impl + in-memory test impl)
src/lib/match/Matchmaker.ts           queue / poll / notify
src/lib/chat/chatMachine.ts           UI state machine: idle → searching → connecting → connected
src/hooks/useChatSession.ts           wires the three together for React
src/components/chat/*                 chat UI
src/components/admin/AdminApp.tsx     admin panel
src/content/landing-pages.ts          SEO pages: add an entry and a new page + sitemap entry appear
supabase/schema.sql                   tables, RLS, all server-side rules
```

## Tuning knobs
- `supabase/schema.sql`: `_queue_ttl()` and `_auto_ban_threshold()`
- `src/components/marketing/OnlineNow.tsx`: `SHOW_FROM` (hide the online counter while numbers are small)
- `NEXT_PUBLIC_FORCE_TURN_RELAY=true`: hides users' IPs from each other (more relay bandwidth)

## Limits on free tiers
- Supabase Free: **200 concurrent realtime connections**, 2M realtime messages/month; **the project pauses after 7 days with no activity**. Upgrade to Pro ($25/mo) when you have real users.
- Vercel Hobby is **non-commercial only**. Add ads or payments → Pro ($20/mo).
- Cloudflare TURN: 1,000 GB/month free, then $0.05/GB.

## Before you launch (not legal advice)
- `/privacy` and `/terms` are templates: fill in `NEXT_PUBLIC_LEGAL_ENTITY` and have them reviewed (GDPR + EU Digital Services Act).
- Make sure `NEXT_PUBLIC_CONTACT_EMAIL` is monitored: it's your channel for illegal-content reports and appeals.
