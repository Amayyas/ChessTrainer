import { Fragment, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import type { Square } from 'react-chessboard/dist/chessboard/types'
import { Box, Button } from '@/components/UI'
import DoubleRule from '@/components/UI/DoubleRule'
import GradeKey from '@/components/UI/GradeKey'
import GradeSign from '@/components/UI/GradeSign'
import { INLINE_LINK_PLAIN } from '@/components/UI/link'
import Notation from '@/components/UI/Notation'
import { ENGINE_LEVELS } from '@/engine/levels'
import ModeGrid from '@/features/home/ModeGrid'
import { COACH_PROPOSAL, DIAGRAM, SAMPLE_GAME, moveNumber } from '@/features/home/sampleGame'
import { board, brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'
import { MOVE_QUALITY } from '@/utils/evaluation'

/**
 * The public front door on '/', set as the front page of a paper.
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

const LEVEL_FLOOR = ENGINE_LEVELS[0]!.elo
const LEVEL_CEILING = ENGINE_LEVELS[ENGINE_LEVELS.length - 1]!.elo

const DIAGRAM_LAST_MOVE = {
  from: DIAGRAM.lastMove.from as Square,
  to: DIAGRAM.lastMove.to as Square,
}
const COACH_ARROW: [Square, Square, string] = [
  COACH_PROPOSAL.from as Square,
  COACH_PROPOSAL.to as Square,
  board.arrow,
]
/** The game's last move, the one the caption quotes, at its place in the score. */
const LAST_PLY = SAMPLE_GAME.length - 1
const LAST_MOVE = SAMPLE_GAME[LAST_PLY]!
// Display-only: the diagram never takes a move, so its move callbacks are no-ops.
const noop = () => false
const noTargets = (): Square[] => []

// The board pulls in react-chessboard (~29 kB gzip). It illustrates one section
// of a page that is otherwise eager for the first paint, so it loads on its own
// and holds an aspect-square gap until it does. Imported by its own path, not
// the Board barrel, which would also pull in EvalBar and MoveHistory.
const ChessBoard = lazy(() => import('@/components/Board/ChessBoard'))

/** The opening of a section: the double rule, then its heading. */
function SectionHead({ id, title, aside }: { id: string; title: string; aside?: string }) {
  return (
    <>
      <DoubleRule />
      <div className="flex flex-wrap items-baseline gap-x-7 gap-y-1.5 pt-4 sm:pt-[22px]">
        <h2 id={id} className="text-balance text-title font-semibold">
          {title}
        </h2>
        {aside && <p className="text-body italic text-ink-soft">{aside}</p>}
      </div>
    </>
  )
}

/** The game as a book prints one: running text, numbered, the grades beside. */
function GameText() {
  return (
    <>
      {SAMPLE_GAME.map((move, index) => (
        <Fragment key={index}>
          {index % 2 === 0 && moveNumber(index)}
          <span className="whitespace-nowrap">
            <Notation san={move.san} />
            {move.grade && (
              <>
                <GradeSign quality={move.grade} />
                <span className="sr-only">, {MOVE_QUALITY[move.grade].label.toLowerCase()}</span>
              </>
            )}
          </span>{' '}
        </Fragment>
      ))}
    </>
  )
}

export default function LandingPage() {
  return (
    <div>
      <section
        aria-labelledby="t-lead"
        className="grid grid-cols-1 pb-14 sm:pb-[4.5rem] sm:pt-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <div className="lg:pr-14 lg:pt-1.5">
          <p className="mb-3 text-kicker font-semibold uppercase text-rubric sm:mb-[18px]">
            Le coach
          </p>
          <h1
            id="t-lead"
            className="mb-[18px] text-balance text-title font-medium sm:mb-7 sm:text-display sm:font-medium"
          >
            {brand.tagline}
          </h1>
          <p className="mb-6 max-w-[30em] text-pretty text-body sm:mb-9 sm:text-lead">
            Analysez vos parties coup par coup avec Stockfish, affrontez une IA calibrée sur{' '}
            {ENGINE_LEVELS.length}&nbsp;niveaux et entraînez votre tactique — sans créer de compte.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3.5">
            <Button asChild size="lg" className="max-sm:w-full">
              <Link to={ROUTES.coach}>Essayer le coach</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="max-sm:w-full">
              <Link to={ROUTES.register}>Créer un compte</Link>
            </Button>
          </div>
        </div>

        <figure id="diagramme-1" className="mt-9 lg:mt-0 lg:border-l lg:border-ink/30 lg:pl-11">
          <div className="mx-auto max-w-[30rem]">
            <Suspense fallback={<div className="aspect-square w-full bg-paper-bright" />}>
              <ChessBoard
                fen={DIAGRAM.fen}
                turn="w"
                interactive={false}
                onMove={noop}
                getLegalTargets={noTargets}
                isPromotion={noop}
                lastMove={DIAGRAM_LAST_MOVE}
                arrows={[COACH_ARROW]}
              />
            </Suspense>
          </div>
          <figcaption className="mx-auto mt-5 max-w-[30rem] text-pretty text-caption italic text-ink-soft">
            <b className="font-semibold not-italic text-ink">Diagramme 1</b> ·{' '}
            {(LAST_PLY + 1) % 2 === 0 ? 'Les Blancs jouent' : 'Les Noirs jouent'}. Le coach a noté{' '}
            <span className="whitespace-nowrap">
              {moveNumber(LAST_PLY)}
              <Notation san={LAST_MOVE.san} />
            </span>
            {LAST_MOVE.grade && (
              <>
                {' '}
                d’un «&nbsp;
                <GradeSign quality={LAST_MOVE.grade} />
                <span className="sr-only">{MOVE_QUALITY[LAST_MOVE.grade].label.toLowerCase()}</span>
                &nbsp;»
              </>
            )}{' '}
            et propose {moveNumber(LAST_PLY + 1)}
            <Notation san={COACH_PROPOSAL.san} />.
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="t-modes" className="pb-14 sm:pb-20">
        <SectionHead
          id="t-modes"
          title="Les modes de jeu"
          aside="Chacun est accessible immédiatement, sans compte."
        />
        <ModeGrid />
      </section>

      <section aria-labelledby="t-levels" className="pb-14 sm:pb-20">
        <DoubleRule />
        <div className="grid grid-cols-1 pt-4 sm:pt-[22px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col lg:pr-14">
            <h2 id="t-levels" className="mb-5 text-balance text-title font-semibold">
              Une IA qui joue à votre niveau, pas au sien
            </h2>
            <p className="mb-5 text-pretty">
              Le mode Affrontement propose {ENGINE_LEVELS.length} adversaires, de {LEVEL_FLOOR} à{' '}
              {LEVEL_CEILING} Elo. Chaque niveau s&apos;appuie sur le modèle de force de
              Stockfish&nbsp;18 — pas sur des étiquettes posées au hasard.
            </p>
            {/* A footnote at the foot of its column, under a short rule, as a
                book sets one. */}
            <p className="relative mt-auto max-w-[24em] pt-3.5 text-caption italic text-ink-soft before:absolute before:left-0 before:top-0 before:w-14 before:border-t before:border-ink">
              Des estimations pour se situer, pas un classement officiel.
            </p>
          </div>
          <ol className="mt-8 lg:mt-0 lg:border-l lg:border-ink/30 lg:pl-11">
            {ENGINE_LEVELS.map((level, index) => (
              <li
                key={level.id}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline border-b border-ink/30 pb-3.5 pt-[13px] first:pt-1 last:border-b-0 sm:grid-cols-[2.25rem_minmax(0,1fr)]"
              >
                <span className="font-bold tabular-nums lining-nums">{index + 1}.</span>
                <p className="flex items-baseline gap-2.5">
                  <span className="whitespace-nowrap text-heading font-semibold">
                    {level.label}
                  </span>
                  {/* Dotted leaders, so the eye runs from the name to its rating. */}
                  <span
                    aria-hidden="true"
                    className="min-w-6 flex-1 border-b border-dotted border-ink/60"
                  />
                  <span className="whitespace-nowrap tabular-nums lining-nums">
                    ~{level.elo} Elo
                  </span>
                </p>
                <p className="col-start-2 mt-[3px] text-pretty text-caption italic text-ink-soft">
                  {level.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="t-notation" className="pb-2">
        <DoubleRule />
        <div className="grid grid-cols-1 pt-4 sm:pt-[22px] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="lg:pr-14">
            <h2 id="t-notation" className="mb-5 text-balance text-title font-semibold">
              Le coach note chacun de vos coups
            </h2>
            <p className="max-w-[34em] text-pretty">
              Après chaque partie, Stockfish rejoue vos coups et les classe du meilleur coup à la
              gaffe, avec la meilleure alternative affichée sur l’échiquier.
            </p>
            <p className="mt-7 max-w-[28em] border-t border-ink/30 pt-5 text-heading font-semibold leading-[1.65]">
              <GameText />
              <span className="whitespace-nowrap text-body font-normal italic text-ink-soft">
                (
                <a href="#diagramme-1" className={INLINE_LINK_PLAIN}>
                  diagramme 1
                </a>
                )
              </span>
            </p>
          </div>
          <aside
            aria-labelledby="t-signs"
            className="mt-8 lg:mt-0 lg:border-l lg:border-ink/30 lg:pl-11"
          >
            <Box className="px-[22px] pb-[18px] pt-5">
              <h3 id="t-signs" className="mb-3 text-kicker font-semibold uppercase">
                Signes conventionnels
              </h3>
              <GradeKey />
            </Box>
          </aside>
        </div>
      </section>
    </div>
  )
}
