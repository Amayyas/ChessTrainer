-- ChessTrainer — per-game accuracy history.
--
-- A single average tells a player how well they play; a series tells them
-- whether they are improving, which is the only one of the two they can act on.
--
-- One JSON document rather than a table of its own: it is written and read
-- whole, always by its owner, and never queried across accounts. A second table
-- would mean a second set of policies to keep in step, for no gain.

alter table public.progression
  add column if not exists accuracy_history jsonb not null default '[]'::jsonb;

-- No new grant or policy: progression is already private to its owner, and the
-- privileges on it are table-wide, so this column is covered the moment it
-- exists. Adding column-level grants here would not tighten anything and would
-- shadow the table-level ones with a list to keep in step forever.
