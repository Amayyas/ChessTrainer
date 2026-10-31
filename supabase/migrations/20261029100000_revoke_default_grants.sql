-- ChessTrainer — hold the older tables to the privileges the migrations grant,
-- not to the ones Supabase granted by default.
--
-- Until Supabase changed its default in 2026, every table and function created
-- in public was granted ALL to anon and authenticated. Every table here was
-- created under that default, so the GRANTs in earlier migrations only ever
-- added to privileges the roles already held: anon could select from
-- progression and hunt_rounds, authenticated could update and delete scores,
-- and anon could execute delete_my_account().
--
-- Row Level Security held in every case, measured against a database carrying
-- those defaults: the reads came back empty, the writes touched no row, and
-- the function refused a caller with no account. So nothing was exposed. But
-- each table rested on one layer where the migrations, and the policy tests,
-- assumed two. Revoking brings the privileges back to what the migrations
-- state, and the policy tests now run against Supabase's defaults (see
-- supabase/tests/bootstrap.sql), so they measure the layers that production
-- actually has.
--
-- profiles is handled in 20261029090000_profile_photo.sql, where a column
-- grant that did not hold would have let a player restore a photo taken down by
-- reports.

revoke all on public.scores, public.achievements, public.progression, public.hunt_rounds
  from anon, authenticated;

-- What the earlier migrations granted, again. Revoking a table privilege takes
-- the column grants beneath it too, so nothing is assumed to have survived.
grant select on public.scores, public.achievements to anon, authenticated;
grant insert on public.achievements to authenticated;
grant select, insert, update on public.progression to authenticated;
-- scores: insert was revoked in 20260813210000_validated_scores.sql, and only
-- submit_hunt_score() writes it. hunt_rounds: only the round functions reach
-- it.

-- Granted to anon by name under the default, so revoking it from PUBLIC in
-- 20260814090000_account_deletion.sql did not take it away.
revoke execute on function public.delete_my_account() from anon;
