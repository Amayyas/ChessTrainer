# Testing

What each layer of tests covers, how to run it, and the one procedure every new
test goes through. Two production bugs in this project were found by the user,
not by the suite; most of what follows exists because of that.

## The layers

| Layer                  | Runner                         | Covers                                                        | Run with                                      |
| ---------------------- | ------------------------------ | ------------------------------------------------------------- | --------------------------------------------- |
| Unit and component     | Vitest, jsdom, Testing Library | `src/**/*.test.{ts,tsx}`: logic, hooks, stores, components    | `npm test`, `npm test -- <path>`              |
| Repository guards      | the same Vitest run            | `src/test/`: files that are not code — headers, CI, env, docs | `npm test -- src/test`                        |
| Database policies      | Vitest on Node, real Postgres  | `supabase/tests/`: row-level security and the score RPCs      | `npm run db:test`, then `npm run test:rls`    |
| Browser smoke          | Playwright, headless Chromium  | `e2e/`: the real build, served under the production headers   | `npm run test:e2e`, after a build             |
| Performance and access | Lighthouse CI                  | the built pages, three runs each, against `lighthouserc.json` | CI only                                       |
| Static analysis        | ESLint, `tsc`, CodeQL          | the TypeScript; CodeQL on every push, PR and weekly           | `npm run lint`, `npm run typecheck`           |
| Gates                  | scripts                        | the dependency audit, the bundle size budget                  | `node scripts/audit-gate.mjs`, `npm run size` |

`npm run ci` runs the format check, lint, typecheck, unit tests, policy tests,
build and size budget in that order — what CI runs, short of Lighthouse, CodeQL
and the browser tests, which are jobs of their own.

### Unit and component tests

Vitest on jsdom, configured in the `test` block of
[`vite.config.ts`](../vite.config.ts), with the stubs jsdom lacks
(`ResizeObserver`, `matchMedia`) in [`src/test/setup.ts`](../src/test/setup.ts).

**Tests run as if nothing were configured.** `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL` are pinned empty, because a test
that reads the developer's `.env` fails on a machine where nothing is wrong —
and CI holds no secrets. Anything a test asserts about must come from the test.

Coverage is measured in CI with a floor a few points under the current totals.
Raise it when the totals move up; never lower it to turn a red run green.
`coverageThresholds.test.ts` fails if the floor is deleted.

jsdom draws nothing and runs no Worker, so a board that renders, an engine that
answers and a move that lands are not covered here. That is what the browser
tests are for.

### Repository guards

Tests in [`src/test/`](../src/test/) check files no other test would read, each
for a failure that happened or nearly did: the CSP and the other headers in
`netlify.toml`, the header resolver the smoke tests serve them with, every CI
job pinning npm, every environment variable the code reads being in
`.env.example`, import casing that only breaks on macOS and Windows, the audit
gate's verdicts on recorded `npm audit` output, the coverage floor still being
there, and [move grading](move-grading.md)'s table matching the code.

The same idea runs through the rest of the suite: **copy that restates data
gets a test that fails when they part.** The home page's level range, the
social image and the grading table are each checked against the data they
describe.

### Database policies

The row-level security policies are the only security in the project that
nothing else covers — CodeQL does not read SQL, and the browser only exercises
what the database already let through.
[`supabase/tests/rls.test.ts`](../supabase/tests/rls.test.ts) applies the real
migrations to a real Postgres and asserts from the attacker's side: what a
client _cannot_ read, write or submit.

`npm run db:test` starts the database in Docker; `npm run test:rls` runs the
tests against it. [`bootstrap.sql`](../supabase/tests/bootstrap.sql) recreates
only the slice of Supabase the migrations lean on — `auth.uid()`, `auth.users`,
the `anon` and `authenticated` roles — and the policies themselves are never
copied.

A policy changed without a test here is unverified. Without Docker these cannot
run locally; say so rather than counting them as passed, and let CI run them.

### Browser smoke tests

[`playwright.config.ts`](../playwright.config.ts) serves `dist/` through
[`scripts/serve-dist.mjs`](../scripts/serve-dist.mjs), under the headers
`netlify.toml` declares. Build first, in guest mode as CI does — a local `.env`
would otherwise point the build at a real Supabase project:

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build
npm run test:e2e
```

Every test fails on a Content-Security-Policy violation, in the page or in the
engine's worker, through [`e2e/csp.ts`](../e2e/csp.ts). They check that the
landing hydrates, that the engine boots and replies, that moves typed and
clicked land on the board, that the boards read to a screen reader, that nothing
shifts on a phone while a slow page arrives, and that every word is on the type
scale.

## Prove the test can fail

A test that has never failed proves nothing. It might assert nothing, or an
earlier check of it might have edited a string that matched nothing and gone
green for the wrong reason. After writing or changing a test:

1. **Commit first.** `git checkout -- <file>`, used to undo the mutation, also
   erases an uncommitted fix. This has cost work three times. If the fix cannot
   be committed yet, copy the file aside and restore from the copy.
2. **Check the anchor before mutating.** Confirm that the exact string you are
   about to replace is in the file — `grep -q '<anchor>' <file> || exit 1`. An
   edit that silently matched nothing produces a green run indistinguishable
   from a passing check.
3. **Break what the test claims to protect** — in the source, never in the
   test. Invert the condition, drop the guard, return a constant. Run that file
   alone and watch it go red.
4. **Restore and watch it go green again.** Report both, quoting the failure
   message the red run printed.

Claude Code runs this as `/verify-test`; the procedure is the same by hand.

### Read the run, not the exit code

**A run with no `Tests …` summary line is a broken measurement, not a red
one.** `--reporter=basic` no longer exists in Vitest 4: a run given it dies
while loading the reporter, before any test executes, and exits non-zero. In a
mutation sweep that reads as every mutation caught — sixteen out of sixteen
once, every one of them false.

### Give every measurement a control

Outside roughly 25–75%, a score stops discriminating: a check that cannot come
out wrong is not a check. When a test samples — the Piece Hunt's random deals,
the engine's calibration games — make sure the case it is about actually
occurred often enough to matter, and assert that too. The test that caught the
champion's square being refilled deals 1,500 boards and also asserts that
more than 500 captures were played, so a dealer that stopped producing them would
fail rather than pass by having nothing to check.

## What is worth asserting

- **Derive the expected value from the data the code exports** rather than
  writing the number back in by hand. A test that restates a constant drifts
  with it and catches nothing.
- **Write the test from the side that has to hold.** For a policy, what an
  attacker cannot do; for a fix, the input that broke it.
- **Say why, in the test.** The comment above a test is where the bug it guards
  against is recorded; most here name the incident that made them necessary.
