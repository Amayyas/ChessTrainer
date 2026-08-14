-- ChessTrainer — put the leaderboard behind a validated submission.
--
-- Until now the client inserted straight into `scores`, and row-level security
-- only checked that the row was filed under its author. That was an accepted
-- trade-off while the app was a single-player trainer: inflating your own
-- dashboard cheated only yourself. A public leaderboard changes that — the anon
-- key ships in the bundle by design, so anyone could post any score in a few
-- lines of fetch, and the leaderboard is the very thing on show.
--
-- A browser game cannot be made unforgeable: the round is played client-side,
-- so the server has no independent account of it. What it can do is refuse the
-- impossible and rate-limit the absurd, which moves forging from trivial to
-- deliberate. That is the goal here, and the ceiling below is stated in terms
-- of the game's own rules rather than a number picked to feel safe.

-- ------------------------------------------------------------ hunt_rounds --
-- A round is opened on the server before it is played, and closed when it is
-- filed. That gives the server its own clock on the round: without it a score
-- is just two numbers that can be posted at any rate, whereas here every
-- submission has to be preceded by a real wait of the length a round takes.
create table if not exists public.hunt_rounds (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  started_at   timestamptz not null default now(),
  -- Set when the round is filed, so one opening can only ever yield one score.
  submitted_at timestamptz
);

create index if not exists hunt_rounds_user_idx on public.hunt_rounds (user_id, started_at desc);

alter table public.hunt_rounds enable row level security;

-- No policy grants direct access: rounds are opened and closed by the functions
-- below, which is the whole point of holding the clock server-side.

/** Opens a round for the caller and returns its id. */
create or replace function public.start_hunt_round()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'a round can only be opened by a signed-in player'
      using errcode = '42501';
  end if;

  -- Opening rounds is rate-limited on its own, so the table cannot be filled
  -- by a caller who never files anything.
  if (
    select count(*) from hunt_rounds
    where user_id = v_user and started_at > now() - interval '1 hour'
  ) >= max_rounds_per_hour() * 3 then
    raise exception 'too many rounds opened in the past hour' using errcode = '54000';
  end if;

  insert into hunt_rounds (user_id) values (v_user) returning id into v_id;
  return v_id;
end;
$$;

-- The shortest a round can honestly last. Three lives can be lost quickly, but
-- not instantly: each costs a second of danger plus the respawn pause.
create or replace function public.min_round_seconds()
returns integer language sql immutable as $$ select 5 $$;

-- Captures need moves, and moves take time. Four a second is far above what a
-- person sustains, so this cannot reject a real round — but it does tie the
-- claim to the clock instead of letting one number vouch for another.
create or replace function public.max_captures_per_second()
returns integer language sql immutable as $$ select 4 $$;

-- The most a single capture can be worth: the queen is the highest-valued enemy
-- at 90 points (see CAPTURE_VALUE), and the combo multiplier caps at 4
-- (MAX_COMBO). No round can therefore score more than 360 per capture.
create or replace function public.max_points_per_capture()
returns integer language sql immutable as $$ select 360 $$;

-- A sixty-second round (ROUND_MS) is played by moving one piece at a time, so
-- captures are bounded by how fast a person can act. This ceiling sits several
-- times above the best a human reaches, which is what keeps it free of false
-- positives while still refusing a fabricated total.
create or replace function public.max_captures_per_round()
returns integer language sql immutable as $$ select 150 $$;

-- Continuous play is a round a minute at best, so this never troubles a real
-- player; it stops a script filling the table.
create or replace function public.max_rounds_per_hour()
returns integer language sql immutable as $$ select 60 $$;

/**
 * Files a finished Piece Hunt round for the caller.
 *
 * SECURITY DEFINER so it can write to a table the client can no longer insert
 * into directly: the checks below cannot be bypassed by talking to PostgREST.
 * The author is taken from the session rather than the arguments, so a round
 * can only ever be filed under the player who played it.
 */
create or replace function public.submit_hunt_score(
  p_round uuid,
  p_piece text,
  p_score integer,
  p_captures integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_started timestamptz;
  v_elapsed numeric;
  v_recent  integer;
  v_id      bigint;
begin
  if v_user is null then
    raise exception 'a round can only be filed by a signed-in player'
      using errcode = '42501';
  end if;

  -- Only the four champions the game offers. The king is not playable.
  if p_piece is null or p_piece not in ('q', 'r', 'b', 'n') then
    raise exception 'unknown champion: %', p_piece using errcode = '22023';
  end if;

  if p_score is null or p_captures is null or p_score < 0 or p_captures < 0 then
    raise exception 'a round cannot have a negative score or capture count'
      using errcode = '22023';
  end if;

  if p_captures > max_captures_per_round() then
    raise exception 'more captures than a sixty-second round allows: %', p_captures
      using errcode = '22023';
  end if;

  -- Every point comes from a capture, and no capture is worth more than the
  -- ceiling above, so this refuses any total the rules cannot produce.
  if p_score > p_captures * max_points_per_capture() then
    raise exception 'score % is not reachable with % captures', p_score, p_captures
      using errcode = '22023';
  end if;

  -- Claim the round: it has to be the caller's own, and still open. Marking it
  -- in the same statement means a second submission finds nothing to claim, so
  -- one opening yields exactly one score even under concurrent calls.
  update hunt_rounds
  set submitted_at = now()
  where id = p_round and user_id = v_user and submitted_at is null
  returning started_at into v_started;

  if v_started is null then
    raise exception 'no open round of yours with that id'
      using errcode = '22023';
  end if;

  v_elapsed := extract(epoch from (now() - v_started));

  if v_elapsed < min_round_seconds() then
    raise exception 'filed % seconds after the round opened, which is faster than it can be played',
      round(v_elapsed) using errcode = '22023';
  end if;

  -- Captures cannot outrun the clock the server itself started.
  if p_captures > ceil(v_elapsed * max_captures_per_second()) then
    raise exception 'more captures than % seconds allow: %', round(v_elapsed), p_captures
      using errcode = '22023';
  end if;

  select count(*) into v_recent
  from scores
  where user_id = v_user and played_at > now() - interval '1 hour';

  if v_recent >= max_rounds_per_hour() then
    raise exception 'too many rounds filed in the past hour'
      using errcode = '54000';
  end if;

  insert into scores (user_id, piece, score, captures)
  values (v_user, p_piece, p_score, p_captures)
  returning id into v_id;

  return v_id;
end;
$$;

-- ----------------------------------------------------------- privileges ----
-- Close the direct route. Without this the function is merely an alternative
-- the client is free to ignore, and every check above is decorative.
revoke insert on public.scores from authenticated;

drop policy if exists "a user submits only their own scores" on public.scores;

-- Reading stays open: the leaderboard is worldwide, and guests browse it.
grant execute on function public.start_hunt_round() to authenticated;
grant execute on function public.submit_hunt_score(uuid, text, integer, integer) to authenticated;

-- Not to anon: a round belongs to an account, and the function refuses a
-- caller without a session anyway.
revoke execute on function public.start_hunt_round() from anon;
revoke execute on function public.submit_hunt_score(uuid, text, integer, integer) from anon;
