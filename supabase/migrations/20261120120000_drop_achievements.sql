-- ChessTrainer — drop the achievements table, which nothing uses.
--
-- It was part of the first data model, for badges to be shown off. Badges
-- ended up in progression.unlocked_badges, private to their owner, and no
-- version of the client ever read or wrote this table (searched through the
-- whole history). It stayed reachable all the same: readable by anyone,
-- including visitors with no account, and writable by any signed-in player
-- under their own id, with badge_id a text of any length. A free-text column
-- the public can read and nobody looks after is a place to leave anything,
-- under one's own name, at any size.
--
-- Its rows, if any, came from direct API calls, not from the game, so there
-- is nothing here to keep. Dropping the table takes its policies and grants
-- with it.

drop table if exists public.achievements;
