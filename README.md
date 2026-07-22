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

Node.js 18 or later, and npm.

## Install and run

```bash
npm install
npm run dev
```

The app is served on http://localhost:5173.

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
| Quality (Node 18 and 20) | `format:check`, `lint`, `typecheck`                        |
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
