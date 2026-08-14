-- ChessTrainer — let a player delete their own account.
--
-- The GDPR right to erasure (article 17) has to be exercisable by the person
-- themselves, not by writing to whoever runs the site. Deleting the row in
-- auth.users cascades through profiles to every table that references it —
-- scores, progression, achievements, hunt_rounds — so one statement removes
-- the account and everything filed under it.
--
-- SECURITY DEFINER because auth.users is not the client's to write to, and the
-- account is taken from the session rather than an argument, so this can only
-- ever delete the caller's own.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'only a signed-in player can delete their account'
      using errcode = '42501';
  end if;

  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
