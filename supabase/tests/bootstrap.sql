-- The parts of Supabase the migrations lean on, and nothing more.
--
-- The policies in supabase/migrations are the only thing standing between one
-- player and another's email, or between a client and a score it never earned.
-- Nothing verified them automatically: CodeQL does not read SQL, and the unit
-- tests only exercise the browser. They were checked once, by hand, weeks ago.
--
-- Running them needs an environment that answers to auth.uid() and knows the
-- anon and authenticated roles. That is a small enough surface to recreate on
-- plain Postgres — far cheaper than the whole Supabase stack, and faithful in
-- the way that matters: the same policies, evaluated by the same engine, under
-- the same roles.

create schema if not exists auth;

-- Supabase's roles. NOLOGIN because tests reach them through SET ROLE rather
-- than by connecting as them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Only the columns the migrations actually reference. A fuller copy would
-- suggest this file tracks Supabase, which it does not.
create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  -- Read by the sign-up trigger, which takes the chosen username and avatar
  -- from it. Sign-up is what creates a profile, so leaving this out did not
  -- fail quietly: nothing could be inserted at all.
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

/**
 * The identity of the caller, read the way Supabase reads it: out of the JWT
 * claims carried on the connection. Tests set that claim to impersonate a
 * player, which is what makes a policy testable at all.
 */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- The leaderboard subscribes to this. Realtime itself is not under test; the
-- publication only has to exist for the migration adding a table to it to run.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;
