-- ChessTrainer — let a player choose their username, accents included, and
-- know at once whether it is free.
--
-- The sign-up trigger used to take the name the player typed and quietly
-- rewrite it: every character outside [A-Za-z0-9_-] was stripped, so "Rémi"
-- became "Rmi", and a name already taken had eight random characters appended.
-- The player found out only on their profile. Two things change here:
--
-- * accented Latin letters are allowed, and two names that differ only by an
--   accent or by case are the same name, so nobody can pass for "remi" by
--   registering "Rémi";
-- * username_status() tells the form, before the account is created, whether a
--   name is free, so the trigger's fallback is left for the rare race between
--   two sign-ups and no longer for the common case.

-- ------------------------------------------------------------- character set --
-- One definition of what a username may contain, read by the format check, by
-- the sign-up trigger and, through username_status(), by the client. Each
-- accented letter has a single unaccented base, which is what lets
-- username_key() fold it with translate(); letters without one (æ, œ, ß, ø)
-- are left out rather than given an arbitrary fold.
create or replace function public.username_charset()
returns text
language sql
immutable
parallel safe
as $$
  select 'A-Za-z0-9_'
    || 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ'
    || 'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ'
    -- Last, so the regex reads it as a literal hyphen rather than a range.
    || '-'
$$;

create or replace function public.is_valid_username(name text)
returns boolean
language sql
immutable
parallel safe
as $$
  select name ~ ('^[' || public.username_charset() || ']{3,24}$')
$$;

-- The form two names are compared in: accents folded, then lower-cased. Folding
-- first matters, because after translate() every character is ASCII and lower()
-- no longer depends on the database's collation.
create or replace function public.username_key(name text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(translate(
    name,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUYY'
  ))
$$;

-- --------------------------------------------------------------- the column --
-- Every name the old trigger produced is plain [A-Za-z0-9_-], 3 to 24 long, but
-- a player could also rename themselves through the API to anything 3 to 24
-- characters long once trimmed: "ab cd", or "Rémi" beside an existing "remi".
-- One such row would make the check or the index below fail, and the whole
-- migration with it. So those rows are renamed first, the way the sign-up
-- trigger settles a name: disallowed characters dropped, a placeholder when
-- fewer than three remain, and a suffix taken from the account's id while the
-- name collides. Of names that collide once folded, the oldest account keeps
-- its own.
do $$
declare
  r         record;
  base      text;
  candidate text;
  attempt   integer;
begin
  for r in
    select p.id, p.username
    from public.profiles p
    where not public.is_valid_username(p.username)
       or exists (
         select 1 from public.profiles q
         where public.username_key(q.username) = public.username_key(p.username)
           and (q.created_at, q.id) < (p.created_at, p.id)
       )
    order by p.created_at, p.id
  loop
    base := left(
      regexp_replace(normalize(r.username, nfc), '[^' || public.username_charset() || ']', '', 'g'),
      24
    );
    if char_length(base) < 3 then
      base := 'joueur';
    end if;
    candidate := base;
    attempt := 0;
    while exists (
      select 1 from public.profiles
      where id <> r.id and public.username_key(username) = public.username_key(candidate)
    ) loop
      attempt := attempt + 1;
      candidate := left(base, 16) || left(md5(r.id::text || attempt), 8);
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end
$$;

alter table public.profiles
  add constraint profiles_username_format check (public.is_valid_username(username));

drop index if exists public.profiles_username_key;
-- The name keeps the "profiles_username" prefix the client's error message
-- matches on.
create unique index profiles_username_key on public.profiles (public.username_key(username));

-- ------------------------------------------------------------------- lookup --
-- 'invalid', 'taken' or 'available'. Profiles are already public, so this says
-- nothing a visitor could not read off the leaderboard. The caller's own name
-- is not "taken" by themselves, which lets the profile page ask the same
-- question about a rename — "Remi" to "Rémi" included.
create or replace function public.username_status(candidate text)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when not coalesce(public.is_valid_username(candidate), false) then 'invalid'
    when exists (
      select 1
      from public.profiles
      where public.username_key(username) = public.username_key(candidate)
        and id is distinct from auth.uid()
    ) then 'taken'
    else 'available'
  end
$$;

revoke execute on function public.username_status(text) from public;
-- anon too: the question is asked on the sign-up form, before any account.
grant execute on function public.username_status(text) to anon, authenticated;

-- ------------------------------------------------------- profile on signup --
-- As before, except that accented letters survive and the text is composed
-- (NFC) first: a browser may send "é" as "e" followed by a combining accent,
-- which the character set does not contain and would strip, leaving the "e".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := normalize(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    nfc
  );
  candidate text := left(
    regexp_replace(requested, '[^' || public.username_charset() || ']', '', 'g'),
    24
  );
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
  -- same name would both pass a prior existence check and one would fail,
  -- taking that signup down with it. The form checks first, so this is the
  -- fallback for that race, not the usual path.
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
