-- =====================================================================
--  Spinly — database schema
--  Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
--
--  Design:
--   * Clients never write tables directly. Every mutation goes through a
--     SECURITY DEFINER function below, so the rules live in one place.
--   * Row Level Security is on for every table; users can read only their
--     own rows, admins (profiles.role = 'admin') can read everything.
--   * Matchmaking is a FIFO queue drained with FOR UPDATE SKIP LOCKED, which
--     is race-safe when many people press "Next" at the same moment.
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text not null default 'Stranger',
  avatar_url       text,
  country          text,
  role             text not null default 'user' check (role in ('user', 'admin')),
  banned           boolean not null default false,
  ban_reason       text,
  age_confirmed_at timestamptz,
  total_matches    integer not null default 0,
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now()
);

create table if not exists public.waiting_queue (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  enqueued_at timestamptz not null default now()
);

create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles(id) on delete cascade, -- the one who waited
  user_b     uuid not null references public.profiles(id) on delete cascade, -- the one who found (WebRTC initiator)
  created_at timestamptz not null default now(),
  ended_at   timestamptz,
  ended_by   uuid
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references public.matches(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (reason in ('nudity', 'minor', 'harassment', 'spam', 'other')),
  details     text,
  status      text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at  timestamptz not null default now()
);

-- Guests have no durable identity, so bans also block the (hashed) IP for a while.
-- IP bans expire because mobile carriers / campuses share IPs between many people.
alter table public.profiles add column if not exists ip_hash text;

create table if not exists public.banned_ips (
  ip_hash    text primary key,
  reason     text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create index if not exists matches_open_a_idx on public.matches (user_a) where ended_at is null;
create index if not exists matches_open_b_idx on public.matches (user_b) where ended_at is null;
create index if not exists matches_created_idx on public.matches (created_at desc);
create index if not exists queue_enqueued_idx on public.waiting_queue (enqueued_at);
create index if not exists reports_reported_idx on public.reports (reported_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------- Tuning knobs ---------------------------------------------
-- Clients heartbeat the queue every ~4s; a row older than this is a closed tab.
create or replace function public._queue_ttl() returns interval language sql immutable as $$ select interval '15 seconds' $$;
-- Unique reporters within 24h that trigger an automatic ban (admin can unban).
create or replace function public._auto_ban_threshold() returns integer language sql immutable as $$ select 5 $$;

-- ---------- Helpers ---------------------------------------------------

-- Salted SHA-256 of the caller's IP (we never store the raw IP).
-- Supabase sits behind Cloudflare, so cf-connecting-ip is the trustworthy one.
create or replace function public._client_ip_hash()
returns text
language plpgsql stable
as $$
declare
  h  json;
  ip text;
begin
  h := nullif(current_setting('request.headers', true), '')::json;
  if h is null then return null; end if;
  ip := nullif(trim(coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', split_part(h->>'x-forwarded-for', ',', 1))), '');
  if ip is null then return null; end if;
  return encode(sha256(convert_to('spinly-ip:' || ip, 'UTF8')), 'hex');
end;
$$;

create or replace function public._ip_banned()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.banned_ips where ip_hash = public._client_ip_hash() and expires_at > now());
$$;

create or replace function public._ban_ip_of(p_user uuid, p_reason text)
returns void
language sql security definer set search_path = public
as $$
  insert into public.banned_ips (ip_hash, reason)
  select ip_hash, p_reason from public.profiles where id = p_user and ip_hash is not null and role <> 'admin'
  on conflict (ip_hash) do update set expires_at = now() + interval '7 days', reason = excluded.reason;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically when someone signs up (Google or otherwise).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  full_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Only expose a first name to strangers.
    coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Stranger'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Self-heal: create my profile if it's missing (e.g. I signed in before this
-- schema was installed, so the trigger above never ran for me).
create or replace function public.ensure_profile()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  u auth.users;
  full_name text;
begin
  select * into u from auth.users where id = auth.uid();
  if not found then return; end if;
  full_name := coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '');
  insert into public.profiles (id, email, display_name, avatar_url)
  values (u.id, u.email, coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Stranger'), u.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
end;
$$;

-- Backfill anyone who signed up before the trigger existed.
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Partner card shown to the other person: first name + country, nothing else.
create or replace function public._partner_json(p_match public.matches, p_me uuid)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'status', 'matched',
    'match_id', p_match.id,
    'initiator', p_match.user_b = p_me,
    'partner', json_build_object('name', p.display_name, 'country', p.country)
  )
  from public.profiles p
  where p.id = case when p_match.user_a = p_me then p_match.user_b else p_match.user_a end;
$$;

-- ---------- Row Level Security ----------------------------------------

alter table public.profiles      enable row level security;
alter table public.waiting_queue enable row level security;
alter table public.matches       enable row level security;
alter table public.reports       enable row level security;
alter table public.banned_ips    enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "queue: admin read" on public.waiting_queue;
create policy "queue: admin read" on public.waiting_queue
  for select to authenticated using (public.is_admin());

drop policy if exists "matches: participants or admin" on public.matches;
create policy "matches: participants or admin" on public.matches
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid() or public.is_admin());

drop policy if exists "reports: admin read" on public.reports;
create policy "reports: admin read" on public.reports
  for select to authenticated using (public.is_admin());

-- No insert/update/delete policies on purpose: all writes go through the functions below.

-- ---------- User-facing functions -------------------------------------

create or replace function public.confirm_age()
returns void
language sql security definer set search_path = public
as $$
  update public.profiles set age_confirmed_at = coalesce(age_confirmed_at, now()) where id = auth.uid();
$$;

create or replace function public.am_i_banned()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false) or public._ip_banned();
$$;

-- Join the queue, or get matched instantly with whoever has waited longest.
create or replace function public.find_match(p_country text default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  me      uuid := auth.uid();
  prof    public.profiles;
  partner uuid;
  m       public.matches;
begin
  if me is null then raise exception 'not_authenticated'; end if;

  select * into prof from public.profiles where id = me;
  if not found then raise exception 'no_profile'; end if;
  if prof.banned or (prof.role <> 'admin' and public._ip_banned()) then raise exception 'banned'; end if;
  if prof.age_confirmed_at is null then raise exception 'age_not_confirmed'; end if;

  update public.profiles
     set last_seen_at = now(),
         country = coalesce(nullif(upper(left(p_country, 2)), ''), country),
         ip_hash = coalesce(public._client_ip_hash(), ip_hash)
   where id = me;

  -- Close anything I was still in, and leave the queue.
  update public.matches set ended_at = now(), ended_by = me
   where ended_at is null and (user_a = me or user_b = me);
  delete from public.waiting_queue where user_id = me;

  -- Housekeeping (cheap, indexed).
  delete from public.waiting_queue where enqueued_at < now() - public._queue_ttl();
  update public.matches set ended_at = now()
   where ended_at is null and created_at < now() - interval '3 hours';

  -- Grab the longest-waiting live person. SKIP LOCKED = no double-matching.
  select q.user_id into partner
    from public.waiting_queue q
    join public.profiles p on p.id = q.user_id and not p.banned
   where q.user_id <> me
     and q.enqueued_at > now() - public._queue_ttl()
   order by q.enqueued_at
   limit 1
   for update of q skip locked;

  if partner is null then
    insert into public.waiting_queue (user_id) values (me)
      on conflict (user_id) do update set enqueued_at = now();
    return json_build_object('status', 'waiting');
  end if;

  delete from public.waiting_queue where user_id = partner;
  insert into public.matches (user_a, user_b) values (partner, me) returning * into m;
  update public.profiles set total_matches = total_matches + 1 where id in (me, partner);

  return public._partner_json(m, me);
end;
$$;

-- Called every few seconds while waiting: heartbeat + "did someone pick me?".
create or replace function public.queue_poll()
returns json
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  m  public.matches;
begin
  if me is null then raise exception 'not_authenticated'; end if;

  select * into m from public.matches
   where ended_at is null and (user_a = me or user_b = me)
   order by created_at desc limit 1;
  if found then return public._partner_json(m, me); end if;

  -- Still waiting? Refresh the heartbeat. (If a matcher holds the row lock,
  -- this blocks until it commits, then we re-check matches below.)
  update public.profiles set last_seen_at = now() where id = me;
  update public.waiting_queue set enqueued_at = now() where user_id = me;
  if found then return json_build_object('status', 'waiting'); end if;

  select * into m from public.matches
   where ended_at is null and (user_a = me or user_b = me)
   order by created_at desc limit 1;
  if found then return public._partner_json(m, me); end if;

  -- Fell out of the queue (e.g. tab was asleep). Client should call find_match again.
  return json_build_object('status', 'requeue');
end;
$$;

-- Lightweight "I'm still here" ping (every ~25s from open tabs). Powers the
-- online counter and the admin's live list without any realtime fan-out cost.
-- Returns true if the user has been banned (client then kicks itself out).
create or replace function public.heartbeat()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  is_banned boolean;
begin
  update public.profiles set last_seen_at = now() where id = auth.uid()
  returning banned or (role <> 'admin' and public._ip_banned()) into is_banned;
  return coalesce(is_banned, false);
end;
$$;

-- Public counter for the landing page (anon allowed; just a number).
create or replace function public.online_count()
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int from public.profiles where last_seen_at > now() - interval '70 seconds' and not banned;
$$;

create or replace function public.leave_queue()
returns void
language sql security definer set search_path = public
as $$
  delete from public.waiting_queue where user_id = auth.uid();
$$;

create or replace function public.end_match(p_match_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.matches set ended_at = now(), ended_by = auth.uid()
   where id = p_match_id and ended_at is null and (user_a = auth.uid() or user_b = auth.uid());
$$;

create or replace function public.report_user(p_match_id uuid, p_reason text, p_details text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me     uuid := auth.uid();
  m      public.matches;
  target uuid;
  n      integer;
begin
  select * into m from public.matches where id = p_match_id and (user_a = me or user_b = me);
  if not found then raise exception 'not_your_match'; end if;
  target := case when m.user_a = me then m.user_b else m.user_a end;

  -- One report per match per reporter.
  if exists (select 1 from public.reports where match_id = p_match_id and reporter_id = me) then return; end if;

  insert into public.reports (match_id, reporter_id, reported_id, reason, details)
  values (p_match_id, me, target, p_reason, left(p_details, 500));

  -- Auto-ban on many independent reports; an admin can reverse it.
  select count(distinct reporter_id) into n from public.reports
   where reported_id = target and created_at > now() - interval '24 hours';
  if n >= public._auto_ban_threshold() or (p_reason = 'minor' and n >= 2) then
    update public.profiles set banned = true, ban_reason = 'auto: ' || n || ' reports in 24h'
     where id = target and role <> 'admin' and not banned;
    perform public._ban_ip_of(target, 'auto');
  end if;
end;
$$;

-- ---------- Admin functions -------------------------------------------

create or replace function public.admin_set_ban(p_user uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles
     set banned = p_banned, ban_reason = case when p_banned then p_reason else null end
   where id = p_user and role <> 'admin';
  if p_banned then
    perform public._ban_ip_of(p_user, coalesce(p_reason, 'manual'));
    delete from public.waiting_queue where user_id = p_user;
    update public.matches set ended_at = now(), ended_by = auth.uid()
     where ended_at is null and (user_a = p_user or user_b = p_user);
    update public.reports set status = 'actioned' where reported_id = p_user and status = 'open';
  else
    delete from public.banned_ips where ip_hash = (select ip_hash from public.profiles where id = p_user);
  end if;
end;
$$;

create or replace function public.admin_resolve_report(p_report uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.reports set status = p_status where id = p_report;
end;
$$;

create or replace function public.admin_stats()
returns json
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'users_total',     (select count(*) from public.profiles),
    'users_today',     (select count(*) from public.profiles where created_at > now() - interval '24 hours'),
    'active_today',    (select count(*) from public.profiles where last_seen_at > now() - interval '24 hours'),
    'banned',          (select count(*) from public.profiles where banned),
    'matches_today',   (select count(*) from public.matches where created_at > now() - interval '24 hours'),
    'matches_total',   (select count(*) from public.matches),
    'live_matches',    (select count(*) from public.matches where ended_at is null and created_at > now() - interval '3 hours'),
    'waiting',         (select count(*) from public.waiting_queue where enqueued_at > now() - public._queue_ttl()),
    'open_reports',    (select count(*) from public.reports where status = 'open')
  );
end;
$$;

-- Everyone online right now, with what they're doing and who they're with.
create or replace function public.admin_online()
returns table (
  id uuid, display_name text, email text, country text, avatar_url text,
  status text, partner_name text, match_id uuid, since timestamptz, last_seen_at timestamptz, banned boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select p.id, p.display_name, p.email, p.country, p.avatar_url,
         case when m.id is not null then 'chatting'
              when q.user_id is not null then 'searching'
              else 'idle' end as status,
         pp.display_name as partner_name,
         m.id as match_id,
         coalesce(m.created_at, q.enqueued_at) as since,
         p.last_seen_at, p.banned
    from public.profiles p
    left join public.waiting_queue q on q.user_id = p.id
    left join lateral (
      select * from public.matches mm
       where mm.ended_at is null and (mm.user_a = p.id or mm.user_b = p.id)
         and mm.created_at > now() - interval '3 hours'
       order by mm.created_at desc limit 1
    ) m on true
    left join public.profiles pp on pp.id = case when m.user_a = p.id then m.user_b else m.user_a end
   where p.last_seen_at > now() - interval '70 seconds'
   order by status, p.last_seen_at desc;
end;
$$;

create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

-- ---------- Permissions -----------------------------------------------

revoke all on function public.find_match(text), public.queue_poll(), public.leave_queue(),
  public.end_match(uuid), public.report_user(uuid, text, text), public.confirm_age(),
  public.am_i_banned(), public.admin_set_ban(uuid, boolean, text),
  public.admin_resolve_report(uuid, text), public.admin_stats(), public.admin_online(),
  public.heartbeat(), public._partner_json(public.matches, uuid),
  public._ip_banned(), public._ban_ip_of(uuid, text)
  from public, anon, authenticated;

grant execute on function public.find_match(text), public.queue_poll(), public.leave_queue(),
  public.end_match(uuid), public.report_user(uuid, text, text), public.confirm_age(),
  public.am_i_banned(), public.admin_set_ban(uuid, boolean, text),
  public.admin_resolve_report(uuid, text), public.admin_stats(), public.admin_online(),
  public.heartbeat()
  to authenticated;

grant execute on function public.online_count() to anon, authenticated;
grant execute on function public.ensure_profile() to authenticated;

-- Newer Supabase projects may not auto-grant API access to new tables.
-- Grant read access explicitly; Row Level Security still decides which rows.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.matches, public.reports, public.waiting_queue, public.banned_ips to authenticated;

-- ---------- Realtime --------------------------------------------------
-- Instant "you've been matched" / "partner left" events (RLS still applies).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;

-- ---------- Make yourself admin ----------------------------------------
-- After you sign in once with Google, run (with your email):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
