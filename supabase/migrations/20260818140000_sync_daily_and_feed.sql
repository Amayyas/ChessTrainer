-- ChessTrainer — the day's counters and the activity feed follow the account.
--
-- Everything else a player builds already does. These two did not, and nothing
-- said so: a change of browser silently emptied the day's challenges and the
-- feed while the score and the badges came back, which reads as a bug rather
-- than as the design it was.
--
-- Counters are not totals, and they do not merge cleanly: two devices playing
-- the same day resolve last-write-wins, the same trade-off the rest of this row
-- already makes. The feed is a log and merges by entry.

alter table public.progression
  add column if not exists daily_counters jsonb not null default '{}'::jsonb;

alter table public.progression
  add column if not exists activity_feed jsonb not null default '[]'::jsonb;

-- No new grant or policy: progression is private to its owner and its
-- privileges are table-wide, so both columns are covered the moment they exist.
