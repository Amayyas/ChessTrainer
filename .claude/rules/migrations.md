---
paths:
  - 'supabase/migrations/**'
---

# Migrations

The row-level security policies are the only security in this project that
nothing else covers — CodeQL does not read SQL, and the browser tests exercise
only code that has already been let through. The bar for changing anything here
is higher than for the app.

## Append-only

A migration that has shipped has already run against the production database.
Editing it makes the file disagree with what is deployed, and the next `db push`
skips it because the timestamp is already recorded. A correction is a **new**
migration, never an edit to an old one.

## Every policy change needs a test

`supabase/tests/rls.test.ts`, written from the attacker's side — what a client
_cannot_ do, because that is the side that has to hold. Run it with
`npm run test:rls` against a Postgres carrying the migrations; `npm run db:test`
starts one (needs Docker). A policy changed without a test here is unverified,
and unverified is how a permissive policy reaches production silently.

## A column change needs the types regenerated

Add, rename or drop a column and `src/lib/database.types.ts` is stale — the
client's row types now describe a schema that no longer exists. Run
`npm run db:types` (needs Docker) in the **same commit**.
`src/lib/database.types.test.ts` replays the migrations in plain Node and fails
on a drifted column set, but it cannot see a column retyped in place
(`integer` → `text`) — check those by hand.

## SECURITY DEFINER functions

- Take the caller from `auth.uid()`, never from an argument — an argument is
  asserted by the client.
- `set search_path` explicitly (the existing functions use `= public`).
- `revoke execute ... from public` **then** grant to the roles that should have
  it. Postgres grants EXECUTE to PUBLIC on every new function and `anon` is a
  member of PUBLIC, so revoking `anon` alone leaves the door open.

## RLS filters rows, not columns

A column a player must not be able to write — their own XP, say — needs a
column-level `GRANT`, not just a policy. A row that passes the policy's check
still has every one of its columns writable unless a grant says otherwise.

## bootstrap.sql is not a mirror

It recreates only the slice of Supabase the migrations lean on: `auth.uid()`,
`auth.users`, the `anon` and `authenticated` roles, the realtime publication.
Growing it to resemble the real thing would suggest it tracks Supabase, which it
does not.
