-- ChessTrainer — initial data model: profiles, scores, puzzles, achievements.
--
-- Row Level Security is enabled on every table and no policy is permissive by
-- default: a misconfigured RLS policy is the highest-consequence mistake
-- impact risk, so each table states exactly who may read and who may write.

-- ---------------------------------------------------------------- profiles --
-- One row per account, created automatically on sign-up by the trigger below.
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text        not null check (char_length(trim(username)) between 3 and 24),
  avatar_piece text        not null default 'n' check (avatar_piece in ('k','q','r','b','n','p')),
  xp           integer     not null default 0 check (xp >= 0),
  level        integer     not null default 1 check (level between 1 and 30),
  created_at   timestamptz not null default now()
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Profiles are public: the leaderboard has to show who holds a score.
drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "a user creates only their own profile" on public.profiles;
create policy "a user creates only their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Ownership only; which columns may change is enforced by the column grants
-- below, because a policy cannot restrict columns.
drop policy if exists "a user edits only their own profile" on public.profiles;
create policy "a user edits only their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------------ scores --
-- One row per finished Piece Hunt round.
create table if not exists public.scores (
  id        bigint generated always as identity primary key,
  user_id   uuid        not null references public.profiles (id) on delete cascade,
  piece     text        not null check (piece in ('q','r','b','n','k')),
  score     integer     not null check (score >= 0),
  captures  integer     not null default 0 check (captures >= 0),
  played_at timestamptz not null default now()
);

-- The leaderboard reads "best scores for a piece", and filters by period.
create index if not exists scores_piece_score_idx on public.scores (piece, score desc);
create index if not exists scores_played_at_idx on public.scores (played_at desc);

alter table public.scores enable row level security;

-- The leaderboard is worldwide, so reading is open even to guests.
drop policy if exists "scores are readable by everyone" on public.scores;
create policy "scores are readable by everyone"
  on public.scores for select
  using (true);

-- A score can only ever be filed under its own author.
drop policy if exists "a user submits only their own scores" on public.scores;
create policy "a user submits only their own scores"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Deliberately no update or delete policy: a submitted score is final.

-- ---------------------------------------------------------- puzzle_progress --
create table if not exists public.puzzle_progress (
  user_id   uuid        not null references public.profiles (id) on delete cascade,
  puzzle_id text        not null,
  solved    boolean     not null default false,
  attempts  integer     not null default 0 check (attempts >= 0),
  solved_at timestamptz,
  primary key (user_id, puzzle_id)
);

alter table public.puzzle_progress enable row level security;

-- Private to its owner: nobody needs to see someone else's puzzle history.
drop policy if exists "puzzle progress is private" on public.puzzle_progress;
create policy "puzzle progress is private"
  on public.puzzle_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "a user writes only their own puzzle progress" on public.puzzle_progress;
create policy "a user writes only their own puzzle progress"
  on public.puzzle_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "a user updates only their own puzzle progress" on public.puzzle_progress;
create policy "a user updates only their own puzzle progress"
  on public.puzzle_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------ achievements --
create table if not exists public.achievements (
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  badge_id    text        not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.achievements enable row level security;

-- Badges are public so a profile can be shown off.
drop policy if exists "achievements are readable by everyone" on public.achievements;
create policy "achievements are readable by everyone"
  on public.achievements for select
  using (true);

drop policy if exists "a user unlocks only their own badges" on public.achievements;
create policy "a user unlocks only their own badges"
  on public.achievements for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------- privileges ----
-- RLS filters *rows*; a GRANT opens the *table*. Both are needed, and relying
-- on Supabase's default privileges is not portable — without these grants every
-- request fails with "permission denied" (42501) however correct the policies.
-- Each role gets only what its policies allow, and nothing more.
grant usage on schema public to anon, authenticated;

-- Readable by everyone, including guests browsing the leaderboard.
grant select on public.profiles, public.scores, public.achievements to anon, authenticated;

-- Column-level, deliberately: RLS filters rows, not columns. Granting update on
-- the whole row would let a player set their own xp and level to anything.
grant insert (id, username, avatar_piece) on public.profiles to authenticated;
grant update (username, avatar_piece) on public.profiles to authenticated;
-- Insert only: a submitted score is final, so no update or delete is granted.
grant insert on public.scores to authenticated;
grant insert on public.achievements to authenticated;
-- Private to its owner, so guests get nothing at all.
grant select, insert, update on public.puzzle_progress to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- ------------------------------------------------------- profile on signup --
-- Creating the profile from the client would need a second round trip that can
-- fail after the account exists, leaving an account with no profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  candidate text := left(regexp_replace(requested, '[^A-Za-z0-9_-]', '', 'g'), 24);
  avatar    text := coalesce(new.raw_user_meta_data ->> 'avatar_piece', 'n');
  attempts  integer := 0;
begin
  if char_length(candidate) < 3 then
    candidate := 'joueur' || left(replace(new.id::text, '-', ''), 6);
  end if;

  -- Metadata comes from the client and could hold anything; an unexpected value
  -- would violate the check constraint and abort the whole signup.
  if avatar not in ('k', 'q', 'r', 'b', 'n', 'p') then
    avatar := 'n';
  end if;

  -- Retry on collision rather than check-then-insert: two signups racing on the
  -- same fallback name would both pass a prior existence check and one would
  -- fail, taking that signup down with it.
  loop
    begin
      insert into public.profiles (id, username, avatar_piece)
      values (new.id, candidate, avatar);
      return new;
    exception
      when unique_violation then
        attempts := attempts + 1;
        if attempts > 5 then
          raise exception 'could not allocate a username for %', new.id;
        end if;
        candidate := left(candidate, 16) || left(replace(gen_random_uuid()::text, '-', ''), 8);
    end;
  end loop;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- realtime --
-- The leaderboard subscribes to score inserts.
alter publication supabase_realtime add table public.scores;
