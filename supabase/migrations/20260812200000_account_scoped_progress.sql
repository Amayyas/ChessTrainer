-- ChessTrainer — tie the hunt board and the puzzle streak to the account.
--
-- Both lived in localStorage keys of their own, so they belonged to the browser
-- rather than to the player: on a shared device one player saw another's
-- records, and signing in elsewhere left them behind. They now travel with the
-- progression row, under the same ownership and row-level security as the rest.

-- Two JSON documents rather than tables of their own: each is small, always
-- read and written whole, and riding the existing progression sync means one
-- mechanism to reason about instead of three.
alter table public.progression
  add column if not exists hunt_scores jsonb not null default '{}'::jsonb;

alter table public.progression
  add column if not exists puzzle_progress jsonb not null default '{}'::jsonb;

-- ------------------------------------------------------------ cleanup ------
-- The puzzle_progress table was created in the initial data model but no client
-- code ever read or wrote it; the puzzle mode kept its progress locally
-- instead. Leaving it in place next to the column added above would give the
-- schema two homes for the same thing, so the unused one goes.
drop table if exists public.puzzle_progress;
