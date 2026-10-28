-- ChessTrainer — a photo in place of the avatar piece, checked before anyone
-- sees it and taken down when players report it.
--
-- A photo is shown wherever the piece is, the worldwide leaderboard included,
-- so nothing reaches it unchecked. The order of events:
--
-- 1. The browser sends the photo to the profile-photo Edge Function, never to
--    storage directly. No policy on storage.objects lets a client write, and
--    no grant lets one set profiles.photo_path, so the function is the only way
--    in and its check cannot be stepped around.
-- 2. The function asks begin_photo_upload() whether the player may try now
--    (rate limit, or a photo of theirs awaiting review), has the image
--    analysed, and only if it passes stores it and calls set_profile_photo().
-- 3. The automatic check reads sexual content, violence and self-harm in an
--    image, but not hate symbols or harassment. Players cover that gap:
--    report_photo() files a report, and at photo_report_threshold() distinct
--    reporters the photo comes down at once — the piece shows again — and is
--    filed in hidden_photos for the owner of the site to review.
--
-- begin_photo_upload(), set_profile_photo() and clear_profile_photo() take the
-- player as an argument, which is safe only because they are executable by
-- service_role alone: the Edge Function, which has read the player from their
-- verified token. A client cannot call them.

-- ------------------------------------------------------------------ storage --
-- Public: a photo that passed is meant to be seen, by visitors too, and a
-- public URL needs no signing round trip on every leaderboard row. Only JPEG,
-- because the browser re-encodes every photo to JPEG before sending it, which
-- also drops the camera's metadata — the location a phone writes into a photo
-- included.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/jpeg'])
on conflict (id) do nothing;

-- ------------------------------------------------------------------ profile --
-- The object's path inside the bucket: "<player id>/<random id>.jpg". A new
-- name for every photo, so a cached old one is never shown for the new, and
-- the player's id first, so everything of theirs can be found and removed.
alter table public.profiles
  add column photo_path text
  check (
    photo_path is null
    or (photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
        and split_part(photo_path, '/', 1) = id::text)
  );

-- No grant to anon or authenticated: the column is the function's to write.

-- ----------------------------------------------------------------- attempts --
-- One row per photo sent for checking, accepted or not. Reading the image
-- costs nothing, but a client looping on it could get the key rate-limited and
-- break the feature for everyone.
create table if not exists public.photo_attempts (
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists photo_attempts_user_time on public.photo_attempts (user_id, attempted_at);

alter table public.photo_attempts enable row level security;

create or replace function public.max_photo_attempts_per_hour()
returns integer
language sql
immutable
as $$ select 10 $$;

-- ------------------------------------------------------------------ reports --
-- A report names the photo as well as the player, so a new photo starts with
-- none, and one player reporting the same photo twice counts once.
create table if not exists public.photo_reports (
  reporter    uuid        not null references public.profiles (id) on delete cascade,
  target      uuid        not null references public.profiles (id) on delete cascade,
  photo_path  text        not null,
  reported_at timestamptz not null default now(),
  primary key (reporter, target, photo_path)
);

alter table public.photo_reports enable row level security;

-- Photos taken down by reports, for the owner of the site to review in the
-- dashboard. No foreign key to the player: if they delete their account the
-- row must stay, because it is the only pointer left to a file still in the
-- bucket. While released_at is null the player cannot send another photo —
-- otherwise the same image goes straight back up and needs three new reports.
create table if not exists public.hidden_photos (
  user_id     uuid        not null,
  photo_path  text        not null,
  hidden_at   timestamptz not null default now(),
  released_at timestamptz,
  primary key (user_id, photo_path)
);

alter table public.hidden_photos enable row level security;

create or replace function public.photo_report_threshold()
returns integer
language sql
immutable
as $$ select 3 $$;

-- No policies on any of the three tables: no client reads or writes them.

-- ----------------------------------------------------------- reporting one --
create or replace function public.report_photo(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_path text;
begin
  if v_user is null then
    raise exception 'only a signed-in player can report a photo' using errcode = '42501';
  end if;
  if p_target = v_user then
    raise exception 'a player cannot report their own photo' using errcode = '22023';
  end if;

  -- The photo reported is the one the target has now, read here rather than
  -- taken from the client, which could name any path.
  select photo_path into v_path from public.profiles where id = p_target;
  if v_path is null then
    return;
  end if;

  insert into public.photo_reports (reporter, target, photo_path)
  values (v_user, p_target, v_path)
  on conflict do nothing;

  if (
    select count(*) from public.photo_reports where target = p_target and photo_path = v_path
  ) >= public.photo_report_threshold() then
    update public.profiles set photo_path = null where id = p_target and photo_path = v_path;
    insert into public.hidden_photos (user_id, photo_path)
    values (p_target, v_path)
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function public.report_photo(uuid) from public;
grant execute on function public.report_photo(uuid) to authenticated;

-- ------------------------------------------------- the Edge Function's side --
-- Security invoker: they run with service_role's own rights, which bypass RLS.
-- Raises with a hint the function maps to a response: 'rate_limited' or
-- 'under_review'.
create or replace function public.begin_photo_upload(p_user uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1 from public.hidden_photos where user_id = p_user and released_at is null
  ) then
    raise exception 'a photo of this player is awaiting review'
      using errcode = 'P0001', hint = 'under_review';
  end if;

  if (
    select count(*) from public.photo_attempts
    where user_id = p_user and attempted_at > now() - interval '1 hour'
  ) >= public.max_photo_attempts_per_hour() then
    raise exception 'too many photos sent this hour'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.photo_attempts (user_id) values (p_user);
end;
$$;

-- Returns the path it replaces, for the function to delete from the bucket.
create or replace function public.set_profile_photo(p_user uuid, p_path text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old text;
begin
  select photo_path into v_old from public.profiles where id = p_user for update;
  update public.profiles set photo_path = p_path where id = p_user;
  return v_old;
end;
$$;

create or replace function public.clear_profile_photo(p_user uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old text;
begin
  select photo_path into v_old from public.profiles where id = p_user for update;
  update public.profiles set photo_path = null where id = p_user;
  return v_old;
end;
$$;

revoke execute on function public.begin_photo_upload(uuid) from public;
revoke execute on function public.set_profile_photo(uuid, text) from public;
revoke execute on function public.clear_profile_photo(uuid) from public;
grant execute on function public.begin_photo_upload(uuid) to service_role;
grant execute on function public.set_profile_photo(uuid, text) to service_role;
grant execute on function public.clear_profile_photo(uuid) to service_role;

-- Supabase grants service_role everything through default privileges; stated
-- here so the policy tests, on plain Postgres, run these as the function does.
grant select, update on public.profiles to service_role;
grant select, insert on public.photo_attempts to service_role;
grant select on public.hidden_photos to service_role;
