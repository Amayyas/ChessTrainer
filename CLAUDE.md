# Working on ChessTrainer AI

Context for Claude Code, read automatically at the start of every session on any
machine. Live at [chesstrainer.fr](https://chesstrainer.fr).

## Ground rules

These are not preferences. Breaking one means the work gets redone.

- **Never start work without being asked.** Answer the question that was asked.
  Investigate freely; do not begin changing things on your own initiative.
- **Commits and PR descriptions in English**, using
  [Conventional Commits](https://www.conventionalcommits.org). The subject says
  what changed; the body says why it was wrong before.
- **Never add a `Co-Authored-By: Claude` trailer**, and never write "Generated
  with Claude Code" in a commit or a PR body.
- **Split work into several logical commits.** One commit per idea, not one
  commit per session.
- **No French anywhere in the repository** — code, comments, tests, README,
  commits, CI. The single exception is copy the player reads: UI strings, error
  messages and the legal pages stay in French, because the audience is French.
- **Rewrite the full recap at the end of every reply**, in French, keeping it
  current. Its shape is fixed: starting analysis, the dated plan, what remains,
  observed corrections and limits, current state.

## Verification, which is the point

Two production bugs were found by the user, not by the test suite. The lesson
stuck, and these follow from it.

- **A test that has never failed proves nothing.** Break the code it covers and
  watch it go red.
- **Measure rather than recall.** Claims about the engine, about bundle size,
  about what a service does — check them. Several confident statements in this
  project turned out to be backwards.
- **Beware the censored measurement.** Outside roughly 25–75%, a score stops
  discriminating, and a check that cannot come out wrong is not a check. Give
  every measurement a control that must fail, and read that control first.
- **Never quote a commit hash without reading it back.** Fabricated hashes have
  reached PR comments twice.

The mechanics behind the first two — the anchor check before a mutation, why to
commit first, which runner covers which files, the band the Elo figures were
measured in — live in `.claude/rules/`. Those files load when the code they
govern is opened, so they are current where it matters without being carried
through every unrelated session.

## Pull requests

- `npm run ci` must pass locally before pushing. It runs format, lint,
  typecheck, tests, build and the bundle size budget.
- `main` is protected: checks must pass, the branch must be current, and every
  review thread must be resolved.
- **Never call a PR ready without querying its state.** Run `/pr-ready`, which
  checks all four blocking conditions — checks, approvals, branch freshness,
  unresolved threads — and confirms the state is stable across more than one
  reading. The automated review posts _after_ the checks go green, so a reading
  taken the moment checks pass is premature.
- The automated reviewer, Qodo, has been right essentially every time. Verify
  each finding rather than deferring to it, but expect it to be correct.
- **Qodo has been silent since 1 September 2026.** It now answers new pull
  requests with `qodo:billing-blocked`: the trial ended and reviews are paused
  until the workspace has credits. Waiting for a review newer than the last push
  therefore waits forever. Until that is resolved, read the silence as one
  signal missing, never as a passing grade — PR #59 has green checks and no
  review at all.

## Deploy budget

Netlify runs on credits: **15 per production deploy**, 300 a month on the free
plan, and **the site is taken offline when they run out**. Deploy previews,
failed builds and CI are free.

So: batch changes into fewer, larger PRs. A dev-dependency bump with no
user-facing benefit can wait for the monthly reset rather than spend a deploy.

## The stack, briefly

React 18, TypeScript strict, Vite, Tailwind, React Router 7, Zustand with
persisted and versioned state. Vitest with Testing Library; a separate
`vitest.rls.config.ts` runs the database policy tests against Postgres.

Supabase provides auth, Postgres and row-level security, hosted in the EU.
Policies are tested — `npm run test:rls` — because nothing else verifies them.

Stockfish 11 runs single-threaded in a Web Worker. It exposes `Skill Level` but
no `UCI_Elo`, which is why the difficulty ladder combines skill, allowed error
and a search-depth cap. The Elo figures on those levels were measured by playing
them against a calibrated Stockfish 18; see `src/engine/levels.ts` for the
method and its caveats.

Sentry reports errors only, lazily loaded, with source maps uploaded at build
time when `SENTRY_AUTH_TOKEN` is set.

### Where things live

`src/features/<domain>/` holds each mode and its hooks. `src/engine/` wraps
Stockfish. `src/store/` holds the Zustand stores. `src/utils/evaluation.ts`
grades moves. `src/seo.ts` is the single source for page titles and which pages
are indexable — the sitemap is generated from it at build time.

### Commands

`npm run dev`, `npm run ci`, `npm run test:watch`, `npm run test:rls`,
`npm run size`.

### Configuration for this agent

`.claude/` is part of the repository and follows its rules: English, formatted,
reviewed. It holds four things.

`settings.json` registers one `PostToolUse` hook, `hooks/format-edited-file.sh`,
which runs Prettier over every file this agent edits and ESLint `--fix` over the
JavaScript and TypeScript among it. About 0.35s per edit, and it removes the
commonest way `npm run ci` fails on a change that is otherwise correct. It never
reaches the network — the binaries come from `node_modules` — and exits quietly
when it does not recognise what it was handed. Hooks declared in a project
settings file only run once the workspace is trusted, which Claude Code asks
about the first time it starts here.

`rules/*.md` are instructions scoped to file paths through their `paths`
frontmatter. They load when a matching file is opened rather than at startup,
which is what keeps this file short.

`skills/pr-ready/` is the `/pr-ready` command: it queries the four conditions
that block a merge and reports each with its evidence.

`settings.local.json`, if it exists, is personal and gitignored.

## Copy that restates data drifts from it

The home page advertised "cinq niveaux, de 800 à 2200 Elo" for two releases
after the ladder had six levels and different figures. Nothing failed, because
the numbers were prose. Derive user-facing copy from the data it describes, and
add a test that fails when someone writes the numbers back in by hand.

## Where the project stands

A snapshot, updated when something material changes rather than every session —
enough to pick the work up on another machine without re-reading a transcript.

**Shipped and verified in production:** the six-level difficulty ladder with
measured Elo; the coach's seven-tier move grading with a legend; password
recovery, tested end to end; a confirmation screen after registering, since
sign-up returns no session while email confirmation is on; a lander that carries
an emailed auth link to the screen it was for, whatever address Supabase drops
it at; `robots.txt` and `sitemap.xml` generated from the route table; per-route
titles and `noindex`.

**Search Console:** the domain property is verified by DNS, the sitemap is
submitted, and indexing has been requested for the home page. Nothing more to do
but wait — a new domain takes days to appear, and the brand query longer.

**Email:** Supabase sends auth mail from its own shared domain, not from
chesstrainer.fr, so DMARC on this domain does not govern it. DMARC is at
`p=quarantine`, moving to `p=reject` once a week of reports comes back clean.
There is no DKIM record; adding one would make `reject` safer, since SPF alone
breaks on forwarded mail.

**Known and deliberately unfixed:** every forced mate collapses to the same
score, so a slower mate is graded Excellent rather than penalised — pre-existing,
and out of scope when it was found. Stockfish stays single-threaded: the shipped
package has no threaded build at all, so multithreading means replacing the
engine, and a full coach analysis of a 40-move game measures 36 seconds on a
desktop, which did not justify the risk.
