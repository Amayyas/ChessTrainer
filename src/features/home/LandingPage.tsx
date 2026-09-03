import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import type { Square } from 'react-chessboard/dist/chessboard/types'
import { Aurora } from '@/components/UI'
import { ENGINE_LEVELS } from '@/engine/levels'
import ModeGrid from '@/features/home/ModeGrid'
import { board, brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'
import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'

/**
 * The public front door on '/'.
 *
 * The dashboard used to sit here, so a visitor typing the domain met an empty
 * progress bar and a mode picker. This presents the product instead — the game
 * modes, the calibrated difficulty ladder, and the coach's move grading.
 * HomeRoute sends a signed-in visitor to the dashboard rather than here.
 *
 * Every figure on the page is read from the data it describes — the level
 * count, the Elo range and each level's rating from ENGINE_LEVELS, the grading
 * tiers from MOVE_QUALITY — and the prose around them is written so it states no
 * count of its own to fall out of step. The home page once advertised "cinq
 * niveaux, de 800 à 2200 Elo" for two releases after the ladder had six with
 * measured figures, because those numbers were prose. LandingPage.test.tsx
 * fails if anyone writes them back by hand.
 */

/** Ebony-band CTA, styled to match the primary Button without being one. */
const CTA_PRIMARY =
  'inline-flex h-12 items-center justify-center rounded-xl bg-or px-6 text-sm font-semibold text-ebene shadow-gold transition-colors hover:bg-or-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2 focus-visible:ring-offset-ebene'

const CTA_GHOST =
  'inline-flex h-12 items-center justify-center rounded-xl border border-ivoire/25 px-6 text-sm font-semibold text-ivoire transition-colors hover:border-ivoire/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2 focus-visible:ring-offset-ebene'

const LEVEL_FLOOR = ENGINE_LEVELS[0]!.elo
const LEVEL_CEILING = ENGINE_LEVELS[ENGINE_LEVELS.length - 1]!.elo

/**
 * The Italian, after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6, with the coach's arrow on the
 * move that gives the position its name — 4.Ng5, hitting f7. A recognisable
 * shape rather than an arbitrary middlegame. Display-only: the board never takes
 * a move, so its move callbacks are no-ops.
 */
const COACH_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
const COACH_LAST_MOVE = { from: 'g8' as Square, to: 'f6' as Square }
const COACH_BEST_MOVE: [Square, Square, string] = ['f3' as Square, 'g5' as Square, board.arrow]
const noop = () => false
const noTargets = (): Square[] => []

// The board pulls in react-chessboard (~29 kB gzip). It illustrates one section
// of a page that is otherwise eager for the first paint, so it loads on its own
// and holds an aspect-square gap until it does. Imported by its own path, not
// the Board barrel, which would also pull in EvalBar and MoveHistory.
const ChessBoard = lazy(() => import('@/components/Board/ChessBoard'))

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-14">
      <section className="relative overflow-hidden rounded-2xl bg-ebene px-6 py-14 text-ivoire sm:px-12 sm:py-20">
        <Aurora />
        <div className="relative max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-or">
            {brand.fullName}
          </p>
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
            {brand.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-ivoire/70">
            Analysez vos parties coup par coup avec Stockfish, affrontez une IA calibrée sur{' '}
            {ENGINE_LEVELS.length} niveaux et entraînez votre tactique — sans créer de compte.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={ROUTES.coach} className={CTA_PRIMARY}>
              Essayer le coach
            </Link>
            <Link to={ROUTES.register} className={CTA_GHOST}>
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-2xl font-bold text-ebene">Les modes de jeu</h2>
        <p className="mb-5 text-sm text-ardoise">
          Chacun est accessible immédiatement, sans compte.
        </p>
        <ModeGrid />
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-ebene px-6 py-12 text-ivoire sm:px-12">
        <Aurora />
        <div className="relative">
          <h2 className="font-display text-2xl font-bold">
            Une IA qui joue à votre niveau, pas au sien
          </h2>
          <p className="mt-3 max-w-2xl text-ivoire/70">
            Le mode Affrontement propose {ENGINE_LEVELS.length} adversaires, de {LEVEL_FLOOR} à{' '}
            {LEVEL_CEILING} Elo. Chaque niveau a été mesuré en le faisant jouer contre un
            Stockfish&nbsp;18 calibré — ce ne sont pas des étiquettes posées au hasard.
          </p>
          <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINE_LEVELS.map((level) => (
              <li
                key={level.id}
                className="flex items-baseline justify-between gap-3 rounded-xl bg-white/5 px-4 py-3"
              >
                <span className="font-semibold">{level.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-or">~{level.elo} Elo</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ivoire/50">
            Des estimations pour se situer, pas un classement officiel.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-2xl font-bold text-ebene">
          Le coach note chacun de vos coups
        </h2>
        <p className="mb-6 max-w-2xl text-sm text-ardoise">
          Après chaque partie, Stockfish rejoue vos coups et les classe du meilleur coup à la gaffe,
          avec la meilleure alternative affichée sur l'échiquier.
        </p>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="mx-auto w-full max-w-sm">
            <Suspense
              fallback={<div className="aspect-square w-full rounded-md bg-ebene/5 shadow-card" />}
            >
              <ChessBoard
                fen={COACH_FEN}
                turn="w"
                interactive={false}
                onMove={noop}
                getLegalTargets={noTargets}
                isPromotion={noop}
                lastMove={COACH_LAST_MOVE}
                arrows={[COACH_BEST_MOVE]}
              />
            </Suspense>
          </div>
          <ul aria-label="Barème de notation des coups" className="flex flex-col gap-2">
            {MOVE_QUALITY_ORDER.map((quality) => {
              const meta = MOVE_QUALITY[quality]
              return (
                <li
                  key={quality}
                  className="flex items-baseline gap-3 rounded-xl bg-white px-4 py-2.5 shadow-card"
                >
                  <span className={`w-7 shrink-0 text-center font-bold ${meta.color}`}>
                    {meta.symbol}
                  </span>
                  <span className="text-sm text-ebene">{meta.label}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <footer className="border-t border-ebene/10 pt-8 text-sm text-ardoise">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display font-bold text-ebene">{brand.fullName}</p>
          <nav aria-label="Pied de page" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to={ROUTES.legal} className="underline-offset-2 hover:text-ebene hover:underline">
              Mentions légales
            </Link>
            <Link
              to={ROUTES.privacy}
              className="underline-offset-2 hover:text-ebene hover:underline"
            >
              Confidentialité
            </Link>
            <a
              href="https://github.com/Amayyas/ChessTrainer"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:text-ebene hover:underline"
            >
              Code source (AGPL)
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
