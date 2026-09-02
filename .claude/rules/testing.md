---
paths:
  - 'src/**/*.test.ts'
  - 'src/**/*.test.tsx'
  - 'supabase/tests/**/*.test.ts'
---

# Tests

Two production bugs were found by the user rather than by this suite. What
follows is the procedure that answers that, not a preference.

## Prove the test can fail

A test that has never failed proves nothing. After writing one:

1. **Commit first.** `git checkout -- <file>`, to undo the mutation, also erases
   an uncommitted fix. This has cost work three times. If the fix is not yet
   committed, copy the file aside and restore from that copy instead.
2. **Assert the anchor before mutating.** Check that the exact string you are
   about to replace is there — `grep -q '<anchor>' <file> || exit 1`. An edit
   that silently matched nothing produces a green run indistinguishable from a
   passing check.
3. **Break what the test claims to protect**, run that file alone, and watch it
   go red: `npm test -- <path>`.
4. **Restore, and watch it go green again.** Report both, quoting the failure
   message the red run produced.

## Which runner

Run it with no reporter flag. `--reporter=basic` no longer exists in Vitest 4:
the run dies while loading the reporter, before a single test executes, and
exits non-zero with no test tally at all. In a mutation sweep that reads as
every mutation caught — sixteen out of sixteen here, every one of them false.
**A run with no `Tests …` summary line is a broken measurement, not a red one**,
and a sweep should say so rather than count it.

`npm test` is Vitest on jsdom and covers `src/**/*.{test,spec}.{ts,tsx}` only.
It runs as if nothing were configured: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL` are pinned empty in
`vite.config.ts`, because a test that reads the developer's `.env` fails on a
machine where nothing is wrong. Anything a test asserts about must come from the
test.

`supabase/tests/` runs apart, under `vitest.rls.config.ts`, with
`npm run test:rls`, against a Postgres carrying the migrations —
`npm run db:test` starts one. Nothing else verifies the row-level security
policies, so a policy change without a test here is unverified.

## What is worth asserting

Derive the expected value from the data the code exports rather than writing the
number back in by hand. A test that restates a constant drifts with it and
catches nothing — which is how the home page advertised five levels for two
releases after the ladder had six.
