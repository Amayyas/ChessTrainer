-- ChessTrainer — cross-device progression (specification deliverable 5).
--
-- M10 shipped accounts and the worldwide leaderboard, but the player's XP,
-- level, badges and statistics still lived only in the browser's localStorage,
-- so signing in on a second device showed a blank profile. This migration gives
-- that progression a home on the server, so it follows the account everywhere.

-- ------------------------------------------------------------ progression --
-- One row per account, mirroring the local progression store. It is owned and
-- written by its player and drives only that player's own dashboard — never a
-- public ranking. The worldwide leaderboard ranks the `scores` table, whose
-- inserts are validated per author under their own policy, so a player editing
-- their own progression only ever misleads themselves.
create table if not exists public.progression (
  user_id         uuid        primary key references public.profiles (id) on delete cascade,
  xp              integer     not null default 0 check (xp >= 0),
  -- The whole ProgressionStats object of the client, kept as one document so a
  -- new statistic never needs a migration here.
  stats           jsonb       not null default '{}'::jsonb,
  unlocked_badges text[]      not null default '{}',
  updated_at      timestamptz not null default now()
);

alter table public.progression enable row level security;

-- Private to its owner: a dashboard is personal, and nothing public reads it.
drop policy if exists "progression is private" on public.progression;
create policy "progression is private"
  on public.progression for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "a user creates only their own progression" on public.progression;
create policy "a user creates only their own progression"
  on public.progression for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "a user updates only their own progression" on public.progression;
create policy "a user updates only their own progression"
  on public.progression for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.progression to authenticated;

-- ------------------------------------------------------- retire dead cols --
-- profiles.xp and profiles.level were added in M10 but never read: every level
-- shown in the app is derived from the progression store, not from these. With
-- progression now the single source of truth, they would only be a second,
-- always-stale copy of the XP — and the M10 grants deliberately kept them out
-- of the client's reach, so nothing could keep them up to date anyway.
alter table public.profiles drop column if exists xp;
alter table public.profiles drop column if exists level;
