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
  v_user   uuid := auth.uid();
  v_recent integer;
  v_id     bigint;
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
grant execute on function public.submit_hunt_score(text, integer, integer) to authenticated;

-- Not to anon: a round belongs to an account, and the function refuses a
-- caller without a session anyway.
revoke execute on function public.submit_hunt_score(text, integer, integer) from anon;
