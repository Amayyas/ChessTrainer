# ChessTrainer AI

Application web de formation aux échecs, articulée autour de l'intelligence artificielle comme
moteur d'apprentissage personnalisé. Réécriture complète (v2.0) de la version scolaire initiale.

Le développement suit le [cahier des charges](./cahier-des-charges.html), module par module.

## Stack

| Domaine     | Choix                                |
| ----------- | ------------------------------------ |
| UI          | React 18 + TypeScript 5              |
| Build       | Vite 5                               |
| Styling     | Tailwind CSS 3                       |
| Navigation  | React Router 6                       |
| Logique jeu | chess.js _(M3)_                      |
| Plateau     | react-chessboard _(M3)_              |
| IA          | Stockfish.js en Web Worker _(M4)_    |
| État global | Zustand _(M4)_                       |
| Animations  | Framer Motion _(M2)_                 |
| Backend     | Supabase — Auth + PostgreSQL _(M10)_ |

Les dépendances annotées d'un module sont ajoutées à ce module, pas avant.

## Prérequis

Node.js 18 ou supérieur, et npm.

## Installation et lancement

```bash
npm install
npm run dev
```

L'application est servie sur http://localhost:5173.

## Scripts

| Script                  | Rôle                                              |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Serveur de développement avec HMR                 |
| `npm run build`         | Vérification des types puis build de production   |
| `npm run preview`       | Sert le build de production localement            |
| `npm run lint`          | ESLint                                            |
| `npm run format`        | Applique Prettier                                 |
| `npm run typecheck`     | `tsc --noEmit`                                    |
| `npm test`              | Tests unitaires Vitest                            |
| `npm run test:watch`    | Vitest en mode watch                              |
| `npm run test:coverage` | Vitest avec rapport de couverture                 |
| `npm run size`          | Vérifie le budget de taille de bundle sur `dist/` |
| `npm run ci`            | Reproduit la CI en local, dans l'ordre            |

Lancez `npm run ci` avant chaque commit : c'est la même séquence que la CI distante.

## Intégration continue

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) s'exécute sur chaque pull
request et sur chaque push vers `main`. La branche `main` est protégée : elle n'accepte que des
merges de PR dont la CI est verte.

| Job                       | Contenu                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Qualité (Node 18 et 20)   | `format:check`, `lint`, `typecheck`                             |
| Tests unitaires           | Vitest + couverture, publiée en artefact                        |
| Build et budget de bundle | Build de production, puis vérification des budgets de taille    |
| Lighthouse                | Audit performance et accessibilité, 3 runs, rapport en artefact |

### Budgets de taille

Définis dans [`scripts/check-bundle-size.mjs`](scripts/check-bundle-size.mjs), exprimés en gzip.
Le cahier des charges classe « taille du bundle Stockfish > 5 Mo » comme un risque de probabilité
haute (section 06) ; ce garde-fou rend une régression visible dès la PR qui l'introduit.

| Catégorie                       | Budget |
| ------------------------------- | ------ |
| JavaScript initial              | 200 kB |
| CSS                             | 50 kB  |
| Stockfish (chargé à la demande) | 5 Mo   |

### Seuils Lighthouse

Configurés dans [`lighthouserc.json`](lighthouserc.json). Performance, accessibilité et bonnes
pratiques sont bloquants ; le SEO est simplement signalé. Ces seuils servent le critère de réussite
n°6 du cahier des charges (« l'application se charge en moins de 5 secondes ») et l'exigence
d'accessibilité WCAG AA de la section 4.2.

| Catégorie        | Seuil | Bloquant |
| ---------------- | ----- | -------- |
| Performance      | 90    | Oui      |
| Accessibilité    | 95    | Oui      |
| Bonnes pratiques | 90    | Oui      |
| SEO              | 90    | Non      |

## Architecture

Structure conforme à la section 3.2 du cahier des charges.

```
src/
├── components/
│   ├── Board/       # Plateau, pièces, flèches, surlignage
│   ├── UI/          # Boutons, cartes, barres, badges
│   └── Layout/      # Navigation, en-tête, conteneurs
├── features/        # Modules fonctionnels
│   ├── coach/       # Mode IA Coach
│   ├── battle/      # Affrontement IA
│   ├── puzzle/      # Mode Puzzle
│   ├── hunt/        # Mode Chasse aux Pièces
│   ├── home/        # Tableau de bord
│   ├── profile/     # Profil utilisateur
│   └── leaderboard/ # Classement mondial
├── engine/          # Wrapper Stockfish (Web Worker)
├── store/           # État global Zustand
├── hooks/           # Hooks React custom
├── types/           # Types partagés
└── utils/           # Helpers chess, formatters
```

`home/`, `profile/` et `leaderboard/` étendent la convention `features/` du cahier des charges,
qui ne nommait explicitement que les 4 modes de jeu.

L'alias `@/` pointe vers `src/`.

## Palette

Définie à la section 4.1 du cahier des charges et exposée en classes Tailwind.

| Nom          | Hex       | Classe Tailwind | Usage                       |
| ------------ | --------- | --------------- | --------------------------- |
| Ébène        | `#1A1A2E` | `ebene`         | Fonds, éléments d'autorité  |
| Or           | `#C9A84C` | `or`            | Accent, CTA, récompenses    |
| Ivoire       | `#F5F0E8` | `ivoire`        | Fond principal des contenus |
| Gris ardoise | `#4A4A5A` | `ardoise`       | Texte secondaire            |

## Avancement

| Module | Intitulé                   | Statut  |
| ------ | -------------------------- | ------- |
| M1     | Setup & Architecture       | ✅ Fait |
| M2     | Design système & UI        | À faire |
| M3     | Core Chess Engine          | À faire |
| M4     | Mode IA Coach              | À faire |
| M5     | Mode Affrontement IA       | À faire |
| M6     | Mode Puzzle                | À faire |
| M7     | Mode Chasse aux Pièces     | À faire |
| M8     | Système de progression     | À faire |
| M10    | Auth, Backend & Classement | À faire |
| M9     | Tests & Optimisation       | À faire |

M10 précède M9, conformément à la phase 4 du planning (section 5.1).
