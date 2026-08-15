# ChessTrainer AI

A web app for chess training, built around artificial intelligence as its personalized
learning engine. Complete rewrite (v2.0) of the initial school-project version.

Development follows the project specification, one module at a time. The user interface is in
French, since the app targets French-speaking learners; the codebase itself is English.

## Stack

| Area         | Choice                               |
| ------------ | ------------------------------------ |
| UI           | React 18 + TypeScript 5              |
| Build        | Vite 5                               |
| Styling      | Tailwind CSS 3                       |
| Routing      | React Router 6                       |
| Game logic   | chess.js _(M3)_                      |
| Board        | react-chessboard _(M3)_              |
| AI           | Stockfish.js in a Web Worker _(M4)_  |
| Global state | Zustand                              |
| Animations   | Framer Motion _(M2)_                 |
| Backend      | Supabase — Auth + PostgreSQL _(M10)_ |

Dependencies annotated with a module are added in that module, not before.

## Requirements

Node.js 22.12 or later, and npm.

Node 18 and 20 have both reached end of life — 20 in April 2026 — so 22 is the
oldest release still receiving security fixes. The minor matters: Vite 8 and
puppeteer-core 25 both ask for `>=22.12`, so `22.0` to `22.11` would install but
not be supported. `.nvmrc` pins the major, so `nvm use` picks up the newest 22.x
you have.

## Install and run

```bash
npm install
npm run dev
```

The app is served on http://localhost:5173.

## Backend setup (optional)

Every mode is playable without a backend: the app detects that no Supabase
project is configured and runs in guest mode, keeping progress in
`localStorage`. Only accounts and the worldwide leaderboard need the steps
below.

### 1. Create the project

1. Sign in on [supabase.com](https://supabase.com) and create a new project.
   Note the database password somewhere safe; it is shown only once.
2. Open **Project Settings > API** and copy **Project URL** and the **anon
   public** key.
3. Copy `.env.example` to `.env.local` and paste both values:

   ```bash
   cp .env.example .env.local
   ```

   The anon key is meant to be public — it is shipped in the browser bundle,
   and Row Level Security is what actually protects the data. Never put the
   `service_role` key in this file.

### 2. Create the tables

`supabase/migrations/` holds the whole schema: tables, Row Level Security
policies, privileges, the trigger that creates a profile on sign-up, and the
realtime publication the leaderboard subscribes to.

The quickest way is the dashboard: open **SQL Editor** and run each file in
`supabase/migrations/` once, in filename order (they are timestamped, so
alphabetical is chronological). Each script is idempotent, so re-running one is
harmless — which is also how you apply a later migration to a project that
already has the earlier ones.

With the [Supabase CLI](https://supabase.com/docs/guides/cli) instead:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Check it worked under **Table Editor**: `profiles`, `scores`,
`puzzle_progress`, `achievements` and `progression` should be listed, each
marked _RLS enabled_.

### 3. Set the URLs

Under **Authentication > URL Configuration**:

- **Site URL** — `http://localhost:5173` while developing, the deployed
  address once online.
- **Redirect URLs** — add `http://localhost:5173/profile` and, once deployed,
  `https://<your-domain>/profile`. Sign-in sends the player back to `/profile`
  and this list is matched exactly, so a missing entry fails the sign-in.

Under **Authentication > Providers > Email**, turn **Confirm email** off while
testing, unless you want to click a confirmation link for every test account.

### 4. Google sign-in (optional)

The button is shown regardless; it only works once this is done.

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project, then **APIs & Services > OAuth consent screen**: choose
   **External**, fill in the app name and your email, and add your own address
   under **Test users** so you can sign in before the app is published.
2. **Credentials > Create credentials > OAuth client ID**, type **Web
   application**. Under **Authorised redirect URIs**, paste the callback shown
   by Supabase in **Authentication > Providers > Google** — it looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`. Add
   `http://127.0.0.1:54321/auth/v1/callback` as well if you intend to sign in
   against a local stack; that is where its own auth service listens, and
   Google rejects any callback not listed here.
3. Copy the generated **Client ID** and **Client secret** into that same
   Supabase Google provider panel, enable it, and save.

Nothing changes in the app itself: the provider is read from the project.

### Running the backend locally

Docker is required. `supabase/config.toml` is already set up for this app —
port 5173, and the `/profile` callback in the allow-list.

```bash
npx supabase start   # applies supabase/migrations automatically
npx supabase status  # prints the local URL and anon key for .env.local
```

For local Google sign-in, put the same credentials in `supabase/.env` (git
ignored, see `supabase/.env.example`). Without it the stack still starts and
email sign-in works; only the Google button is inert.

## Scripts

| Script                  | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Development server with HMR                  |
| `npm run build`         | Type check, then production build            |
| `npm run preview`       | Serve the production build locally           |
| `npm run lint`          | ESLint                                       |
| `npm run format`        | Apply Prettier                               |
| `npm run typecheck`     | `tsc --noEmit`                               |
| `npm test`              | Vitest unit tests                            |
| `npm run test:watch`    | Vitest in watch mode                         |
| `npm run test:coverage` | Vitest with a coverage report                |
| `npm run size`          | Check the bundle size budget against `dist/` |
| `npm run ci`            | Reproduce the CI pipeline locally, in order  |

Run `npm run ci` before every commit: it is the same sequence as the remote CI.

## Continuous integration

The workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and
on every push to `main`. The `main` branch is protected: it only accepts merges from PRs whose CI
is green.

| Job                      | Contents                                                   |
| ------------------------ | ---------------------------------------------------------- |
| Quality (Node 22 and 24) | `format:check`, `lint`, `typecheck`                        |
| Unit tests               | Vitest + coverage, published as an artifact                |
| Build & bundle budget    | Production build, then size-budget check                   |
| Lighthouse               | Performance & accessibility audit, 3 runs, report artifact |

### Size budgets

Defined in [`scripts/check-bundle-size.mjs`](scripts/check-bundle-size.mjs), expressed in gzip.
The specification rates "Stockfish bundle above 5 MB" as a highly probable risk (section 06); this
guard makes a regression visible on the PR that introduces it.

| Category                     | Budget |
| ---------------------------- | ------ |
| Initial JavaScript           | 200 kB |
| CSS                          | 50 kB  |
| Stockfish (loaded on demand) | 5 MB   |

"Initial JavaScript" is read from the Vite build manifest — the entry chunk and its static
imports only. The lazily loaded route chunks are reported for visibility but do not count against
it, since the first paint never downloads them.

### Lighthouse thresholds

Configured in [`lighthouserc.json`](lighthouserc.json). Performance, accessibility and best
practices are blocking; SEO only warns. These thresholds serve success criterion 6 of the
specification ("the app loads in under 5 seconds") and the WCAG AA accessibility requirement of
section 4.2.

| Category       | Threshold | Blocking |
| -------------- | --------- | -------- |
| Performance    | 90        | Yes      |
| Accessibility  | 95        | Yes      |
| Best practices | 90        | Yes      |
| SEO            | 90        | No       |

## Architecture

Class diagrams of the engine layer, the game modes, the global state and the data
model are in [docs/architecture.md](docs/architecture.md).

Structure mirrors section 3.2 of the specification.

```
src/
├── components/
│   ├── Board/       # Board, pieces, arrows, highlighting
│   ├── UI/          # Buttons, cards, bars, badges
│   └── Layout/      # Navigation, header, containers
├── features/        # Functional modules
│   ├── coach/       # AI Coach mode
│   ├── battle/      # AI battle mode
│   ├── puzzle/      # Puzzle mode
│   ├── hunt/        # Piece Hunt arcade mode
│   ├── home/        # Dashboard
│   ├── profile/     # User profile
│   └── leaderboard/ # Global leaderboard
├── engine/          # Stockfish wrapper (Web Worker)
├── store/           # Zustand global state
├── hooks/           # Custom React hooks
├── types/           # Shared types
└── utils/           # Chess helpers, formatters
```

`home/`, `profile/` and `leaderboard/` extend the `features/` convention of the specification,
which only named the 4 game modes explicitly.

The `@/` alias points to `src/`.

## Palette

Defined in section 4.1 of the specification and exposed as Tailwind classes.

| Name  | Hex       | Tailwind class | Usage                   |
| ----- | --------- | -------------- | ----------------------- |
| Ebony | `#1A1A2E` | `ebene`        | Backgrounds, authority  |
| Gold  | `#C9A84C` | `or`           | Accent, CTA, rewards    |
| Ivory | `#F5F0E8` | `ivoire`       | Main content background |
| Slate | `#4A4A5A` | `ardoise`      | Secondary text          |

Tailwind color keys keep their French names to match the specification wording.

## Progress

| Module | Title                       | Status  |
| ------ | --------------------------- | ------- |
| M1     | Setup & Architecture        | ✅ Done |
| M2     | Design system & UI          | ✅ Done |
| M3     | Core Chess Engine           | ✅ Done |
| M4     | AI Coach mode               | ✅ Done |
| M5     | AI Battle mode              | ✅ Done |
| M6     | Puzzle mode                 | ✅ Done |
| M7     | Piece Hunt mode             | ✅ Done |
| M8     | Progression system          | ✅ Done |
| M10    | Auth, Backend & Leaderboard | To do   |
| M9     | Tests & Optimization        | To do   |

M10 precedes M9, per phase 4 of the plan (section 5.1).
