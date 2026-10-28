# AGENTS.md — ChessTrainer AI

Instructions for any coding agent working in this repository: Claude Code,
Codex, Cursor, Copilot, Gemini or another. Live at
[chesstrainer.fr](https://chesstrainer.fr). `CLAUDE.md` imports this file and
adds only what is specific to Claude Code; everything shared lives here, once.

ChessTrainer is a static React app that runs Stockfish in the browser: an AI
coach that grades every move, a battle mode with six calibrated levels, puzzles,
and an arcade mode, the Piece Hunt. Supabase holds accounts, progression and a
worldwide leaderboard. Every mode works without an account and without a
backend.

## Ground rules

These are not preferences. Breaking one means the work gets redone.

- **Never start work without being asked.** Answer the question that was asked.
  Investigate freely; do not begin changing things on your own initiative.
- **Never merge, deploy or release without the owner's explicit go**, given for
  that step. Approval of one merge is not approval of the next.
- **Commits and PR descriptions in English**, using
  [Conventional Commits](https://www.conventionalcommits.org). The subject says
  what changed; the body says why it was wrong before.
- **No AI attribution.** No `Co-Authored-By` trailer naming an agent or a model,
  and no "Generated with …" line, in a commit or in a PR body.
- **Split work into several logical commits.** One commit per idea, not one
  commit per session.
- **No French anywhere in the repository** — code, comments, tests, README,
  commits, CI. The single exception is copy the player reads: UI strings, error
  messages and the legal pages stay in French, because the audience is French.
- **Never commit what you did not create.** Stage files by name; a stray
  `.idea/` or a personal note in the working tree is not part of the change.

## Verification, which is the point

Two production bugs were found by the user, not by the test suite. The lesson
stuck, and these follow from it.

- **A test that has never failed proves nothing.** Break the code it covers and
  watch it go red. The procedure is in [docs/testing.md](docs/testing.md).
- **Measure rather than recall.** Claims about the engine, about bundle size,
  about what a service does — check them. Several confident statements in this
  project turned out to be backwards.
- **Beware the censored measurement.** Outside roughly 25–75%, a score stops
  discriminating, and a check that cannot come out wrong is not a check. Give
  every measurement a control that must fail, and read that control first.
- **Never quote a commit hash without reading it back** with `git log -1`.
  Fabricated hashes have reached PR comments twice.
- **Silence is not a pass.** A reviewer that never ran, a CI job that never
  started, a run with no test summary line: each looks exactly like a clean
  result. Confirm something ran before reading its absence of findings.

## Setup and commands

Node.js 22.15 or later (`package.json` `engines`; `.nvmrc` pins the major), and
npm. `npm install`, then `npm run dev` serves http://localhost:5173 in guest
mode with no further setup.

| Command                      | What it does                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run ci`                 | Format check, lint, typecheck, unit tests, database policy tests, build, bundle budget — the CI pipeline, in order. Run before every push. |
| `npm test -- <path>`         | One unit test file (Vitest, jsdom). No `--reporter=basic`: it does not exist in Vitest 4 and kills the run before any test.                |
| `npm run test:watch`         | Vitest in watch mode.                                                                                                                      |
| `npm run test:rls`           | Row-level security tests against Postgres. `npm run db:test` starts one; both need Docker.                                                 |
| `npm run test:e2e`           | Playwright smoke tests against `dist/`. Build first, in guest mode as CI does: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build`. |
| `npm run size`               | Bundle size budget against `dist/`.                                                                                                        |
| `npm run db:types`           | Regenerates `src/lib/database.types.ts` from the migrations (Docker).                                                                      |
| `npm run lint:fix`, `format` | ESLint `--fix` and Prettier over the repository.                                                                                           |

The e2e tests are a CI job of their own, not part of `npm run ci`. If Docker is
unavailable, say so: the policy tests were not run, and CI is the only place
they will be.

## Where things live

| Path                                            | Contents                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/features/<domain>/`                        | One folder per mode or page, with its hooks: `coach`, `battle`, `puzzle`, `hunt`, `progression`, `auth`, … |
| `src/engine/`                                   | The Stockfish wrapper — the project's only domain class — and `levels.ts`, the difficulty ladder.          |
| `src/store/`                                    | Zustand stores, persisted and versioned: progression, auth, board preferences.                             |
| `src/utils/evaluation.ts`                       | Move grading and accuracy. See [docs/move-grading.md](docs/move-grading.md).                               |
| `src/utils/describeBoard.ts`                    | What the boards say to a screen reader. See [docs/accessibility.md](docs/accessibility.md).                |
| `src/components/`                               | `Board/` (chessground and the keyboard field), `UI/`, `Layout/`.                                           |
| `src/lib/design-tokens.ts`                      | Every colour, size and duration. See [docs/design-system.md](docs/design-system.md).                       |
| `src/seo.ts`                                    | Page titles and which pages are indexable; the sitemap and `llms.txt` are generated from it.               |
| `src/entry-server.tsx`, `scripts/prerender.mjs` | The prerendered home page. See [docs/rendering.md](docs/rendering.md).                                     |
| `supabase/migrations/`                          | The whole schema, policies and score validation. Append-only.                                              |
| `supabase/tests/`                               | The policy tests, written from the attacker's side.                                                        |
| `scripts/`                                      | Build steps, CI gates, the deployed-site check, Stockfish vendoring, the puzzle import, level calibration. |
| `public/stockfish/`                             | Stockfish 18 `lite-single`, vendored from a pinned release. Never edit by hand.                            |
| `e2e/`                                          | Playwright smoke tests, the CSP checks, the type-scale check.                                              |

The `@/` import alias points to `src/`. [docs/architecture.md](docs/architecture.md)
has the diagrams of the engine, the modes, the stores and the data model.

## Rules for specific areas

Read the matching file before changing anything it covers. They are written for
agents and kept next to the code they govern.

| Before touching                    | Read                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| `src/engine/**`                    | [.claude/rules/engine.md](.claude/rules/engine.md)         |
| `supabase/migrations/**`           | [.claude/rules/migrations.md](.claude/rules/migrations.md) |
| any test file                      | [.claude/rules/testing.md](.claude/rules/testing.md)       |
| a component, a colour, a font size | [docs/design-system.md](docs/design-system.md)             |

The short version of each:

- **Engine:** strength comes from `UCI_LimitStrength` + `UCI_Elo` and nothing
  else; `Skill Level` is inert under it. Depth caps stay at 12 or below. Every
  Elo figure is ±150 and lives in `src/engine/levels.ts` — import it, never
  restate it.
- **Migrations:** a shipped migration is never edited — a correction is a new
  file. Every policy change gets a test in `supabase/tests/rls.test.ts`. A column
  change regenerates `database.types.ts` in the same commit. `SECURITY DEFINER`
  functions take the caller from `auth.uid()`, set `search_path`, and revoke
  `EXECUTE` from `public` before granting it.
- **Design:** values come from the tokens, never written inline. No rounded
  corners, shadows, gradients or icon library. The rubric red marks what needs
  attention and nothing else.

## Conventions worth knowing before the first edit

- **Copy that restates data drifts from it.** The home page advertised "cinq
  niveaux, de 800 à 2200 Elo" for two releases after the ladder had six levels
  and different figures. Derive user-facing copy from the data it describes, and
  add a test that fails when someone writes the numbers back in by hand. The
  same holds for documentation: name the constant, do not copy its value.
- **Persisted state is versioned.** Changing the shape of a persisted Zustand
  store means bumping its `version` and handling the old shape in `migrate`, or
  every returning player loses their progress. Storage keys are prefixed
  `chesstrainer.`.
- **Guests are first-class.** No mode may require an account; only the
  worldwide leaderboard does. Progression is scoped to an owner, so a sign-out
  must never leave one player's data to the next.
- **The client is not trusted.** The anon key ships in the bundle. Anything the
  server must believe — a score — is checked server-side; RLS filters rows, not
  columns, so a column a player must not write needs a column grant.
- **Moves are shown in figurine notation** and typed in French notation (R, D,
  T, F, C). Chess logic goes through chess.js, except in the Piece Hunt, which
  has rules of its own in `src/features/hunt/board.ts`.
- **Tests read nothing from the developer's `.env`.** `vite.config.ts` pins
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL` empty under
  Vitest; anything a test asserts about must come
  from the test.

## Pull requests

- `npm run ci` must pass locally before pushing.
- `main` is protected: the required checks must pass, the branch must be current
  with `main`, and every review thread must be resolved. After one PR merges,
  each other open PR has to be brought up to date and its checks run again.
- Required checks are matched by name. Renaming a CI job does not weaken the
  gate, it jams it: every PR stays blocked until the protection is updated.
- **Never call a PR ready from one green signal.** Query all four conditions —
  checks, approvals, branch freshness, unresolved threads (in full, through
  GraphQL) — and take a second reading before concluding. The procedure, with
  its commands, is in [.claude/skills/pr-ready/SKILL.md](.claude/skills/pr-ready/SKILL.md).
- **Review before pushing.** Read the branch's own diff as a reviewer would,
  while the code is still private. Changes to auth, policies or secrets deserve
  a security pass of their own.
- **CodeRabbit reviews on demand only: comment `@coderabbitai review`.** On the
  free tier for public repositories it starts nothing by itself, and posts a
  green `CodeRabbit` status reading "Review skipped: manual review required for
  this OSS repository" — green for a review that never ran. It allows about one
  review an hour; "Review rate limited" is not a review either. Its settings are
  in `.coderabbit.yaml`. Verify each finding rather than deferring to it.
- Dependabot opens grouped minor and patch updates weekly; majors are ignored on
  purpose and taken by hand.

## Releases and the deploy budget

Releases are handled by release-please: it keeps one open "release PR" that
bumps the version and updates `CHANGELOG.md`; merging it tags the commit and is
the only merge that deploys. `feat` moves the minor, `fix`/`perf` the patch,
everything else rides along.

Netlify runs on a free plan with a monthly credit allowance that resets on the
**16th**, and **every project is paused when it runs out**. A production deploy
costs 15 credits, so **merging the release PR is spending them**: treat it as a
deploy, with the owner's go. Merging anything else into `main` costs nothing and
publishes nothing — a merged change is not live until the next release.

The mechanics — the `ignore` command, what traffic costs, the build hook, what
to do when the release build fails, how to check production afterwards — are in
[docs/releasing.md](docs/releasing.md). Read it before touching
`netlify.toml`, the release workflow or the manifest.

## The stack, briefly

React 18, TypeScript strict, Vite, Tailwind, React Router 7, Zustand. Vitest
with Testing Library on jsdom; a separate `vitest.rls.config.ts` for the policy
tests; Playwright for the browser smoke tests; Lighthouse CI in the pipeline.

Supabase provides auth, Postgres and row-level security, hosted in the EU. The
client's row types live in `src/lib/database.types.ts`, generated from the
migrations; `database.types.test.ts` replays the migrations in plain Node and
fails when the committed file drifts.

Stockfish 18 (the `lite-single` NNUE build) runs single-threaded in a Web
Worker, loaded on demand. The top four levels set `UCI_Elo` directly; the two
below Stockfish's 1320 floor both pin it there and differ only by a depth cap,
which a play-test found changes nothing — their Elo gap is a placement, not a
measured difference. A threaded build would need `SharedArrayBuffer`, so COOP/COEP on every
response, and it buys nothing at the depths this app searches.

The boards are chessground (GPL-3.0-or-later), drawn as a printed diagram. The
code is AGPL-3.0: a deployed fork must offer its full source to its users.

Sentry reports errors only, loaded lazily after first paint, with source maps
uploaded at build time when `SENTRY_AUTH_TOKEN` is set. The Content-Security-
Policy in `netlify.toml` is enforced, and `scripts/check-deployed.mjs` checks
that production serves it character for character.

## Where the project stands

A snapshot, updated when something material changes rather than every session —
enough to pick the work up on another machine without re-reading a transcript.

**Shipped and verified in production:** the six-level difficulty ladder; the
coach's seven-tier move grading with a legend; password recovery, tested end to
end; a confirmation screen after registering, since sign-up returns no session
while email confirmation is on; a lander that carries an emailed auth link to
the screen it was for, whatever address Supabase drops it at; `robots.txt` and
`sitemap.xml` generated from the route table; per-route titles and `noindex`.

**The newsprint redesign, shipped in 2.5.0 (22 October 2026):** direction A,
"Chronique", merged as one stack of four pull requests (#123, #124, #128,
#130). Paper, ink and one red, the rubric; Newsreader; rules instead of boxes;
moves in figurine notation. The boards are chessground drawn as a printed
diagram, the dark squares hatched or, on the player's choice, plain; every board
the player plays on takes a move typed in French notation. The rules are in
[docs/design-system.md](docs/design-system.md).

**Built after 2.5.0, live with the next release:** every board is said in
words to a screen reader — the position as its description, each move in a
live region, and in the Piece Hunt the danger, again on each square it follows
the champion to. No square can be visited one by one; the keyboard field is how
a move is made. Also `llms.txt`, a 404 for `/.well-known/`, and a fix for the
Piece Hunt refilling the board onto the champion's square.

**Search Console:** the domain property is verified by DNS, the sitemap is
submitted, and indexing has been requested for the home page. Nothing more to do
but wait — a new domain takes days to appear, and the brand query longer.

**Email:** Supabase sends auth mail from its own shared domain, not from
chesstrainer.fr, so DMARC on this domain does not govern it. The domain's own
mail is one OVH Zimbra Starter mailbox, `contact@chesstrainer.fr`, which also
receives the DMARC aggregate reports. (The OVH panel also lists an empty
"redirect" email offer for the domain; it is not where the mail lives.) DMARC
has been at `p=reject` since 5 September 2026, after a week of aggregate
reports came back clean with no legitimate sender failing.

DKIM is active: Zimbra signs outgoing mail with `d=chesstrainer.fr`, under the
selectors `ovhmo-selector-1` and `ovhmo-selector-2`, both CNAMEs to keys OVH
publishes. Measured on 1 October 2026 on a real message to Gmail: SPF, DKIM and
DMARC all `PASS`, with DKIM aligned on chesstrainer.fr. A probe of common
selector names finds nothing, because the OVH name has a hyphen before the
digit; only a real message's `DKIM-Signature` header gives the selector
reliably. Mail sent through OVH's SMTP is covered; mail sent "as" this address
from another provider, such as Gmail's send-as, is not, and `reject` would
refuse it.

**Known and deliberately unfixed:** per-move accuracy saturates on forced
mates — see [docs/move-grading.md](docs/move-grading.md) for why that is a
choice and not an oversight. Stockfish stays single-threaded, for the reason
given above; a full 40-move analysis at the coach's depth measured a few seconds
on a desktop.
