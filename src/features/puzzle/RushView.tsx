import { Box, Button, PageHeader, Tag } from '@/components/UI'
import BoxScore from '@/components/UI/BoxScore'
import PuzzleBoardColumn from '@/features/puzzle/PuzzleBoardColumn'
import type { RushRun } from '@/features/puzzle/progress'
import { RUSH_DURATION_MS, RUSH_MAX_STRIKES } from '@/features/puzzle/rushSet'
import { DIFFICULTY_LABELS, difficultyOf } from '@/features/puzzle/types'
import { useRushSession } from '@/features/puzzle/useRushSession'
import { cn } from '@/utils/cn'

const PANEL_HEAD = 'text-kicker font-semibold uppercase'

/** A clock reading: m:ss. */
function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/** "12 puzzles", "1 puzzle". */
function puzzles(count: number): string {
  return `${count} puzzle${count > 1 ? 's' : ''}`
}

/** The rules, read from the constants that enforce them. */
const RULES =
  `${RUSH_DURATION_MS / 60_000} minutes pour résoudre le plus de puzzles possible, ` +
  `chacun un peu plus difficile que le précédent. Un mauvais coup coûte une erreur ` +
  `et passe au puzzle suivant ; à ${RUSH_MAX_STRIKES} erreurs, le Rush s’arrête.`

/** The player's best runs, the one just ended set in bold. */
function Ranking({ runs, current }: { runs: readonly RushRun[]; current: RushRun | null }) {
  return (
    <section aria-labelledby="t-ranking">
      <h2 id="t-ranking" className={cn(PANEL_HEAD, 'mb-1')}>
        Vos meilleurs Rush
      </h2>
      {runs.length === 0 ? (
        <p className="text-caption italic text-ink-soft">
          Aucun Rush pour l’instant : le premier fixera votre record.
        </p>
      ) : (
        <ol>
          {runs.map((run, index) => {
            const isCurrent = current !== null && run.at === current.at
            return (
              <li
                key={`${run.at}|${run.score}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={cn(
                  'flex items-baseline justify-between gap-3 border-t border-ink/30 py-2 text-caption first:border-t-0',
                  isCurrent && 'font-semibold',
                )}
              >
                <span className="tabular-nums lining-nums">
                  {index + 1}. {puzzles(run.score)}
                </span>
                <span className="text-ink-soft">{DAY.format(new Date(run.at))}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/**
 * Puzzle Rush: the rules and the ranking, then the run against the clock,
 * then the result. The board column is the one every puzzle mode shares.
 */
export default function RushView() {
  const rush = useRushSession()
  const best = rush.ranking[0]?.score ?? 0

  if (rush.phase === 'ready' || !rush.puzzle) {
    return (
      <div>
        <PageHeader title="Puzzles" subtitle="Puzzle Rush — contre la montre." />
        <Box className="mx-auto flex max-w-xl flex-col gap-5">
          <p className="text-body">{RULES}</p>
          <Ranking runs={rush.ranking} current={null} />
          <Button size="lg" fullWidth onClick={rush.start}>
            Lancer le Rush
          </Button>
        </Box>
      </div>
    )
  }

  if (rush.phase === 'over') {
    const outOfStrikes = rush.strikes >= RUSH_MAX_STRIKES
    return (
      <div>
        <PageHeader title="Puzzles" subtitle="Puzzle Rush terminé." />
        <Box className="mx-auto flex max-w-xl flex-col gap-5">
          <div>
            <h2 className={PANEL_HEAD}>Bilan du Rush</h2>
            <p className="mt-1 text-body italic">
              {outOfStrikes ? `${RUSH_MAX_STRIKES} erreurs : le Rush s’arrête.` : 'Temps écoulé.'}
            </p>
          </div>
          <BoxScore
            phoneColumns={3}
            figures={[
              { label: 'Résolus', value: rush.solved },
              { label: 'Record', value: Math.max(best, rush.solved) },
              { label: 'Erreurs', value: `${rush.strikes}/${RUSH_MAX_STRIKES}` },
            ]}
          />
          {rush.isNewBest && (
            <div>
              <Tag tone="ink">Nouveau record !</Tag>
            </div>
          )}
          <Ranking runs={rush.ranking} current={rush.lastRun} />
          <Button size="lg" fullWidth onClick={rush.start}>
            Relancer un Rush
          </Button>
        </Box>
      </div>
    )
  }

  const puzzle = rush.puzzle
  return (
    <div>
      <PageHeader
        title="Puzzles"
        subtitle={`Puzzle Rush — ${puzzles(rush.solved)} résolu${rush.solved > 1 ? 's' : ''}.`}
      />
      <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <PuzzleBoardColumn
          runner={rush}
          interactive={!rush.isSolved && !rush.isPaused}
          idleMessage="Puzzle suivant…"
        />
        <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
          <BoxScore
            phoneColumns={3}
            figures={[
              { label: 'Temps', value: formatClock(rush.remainingMs) },
              { label: 'Résolus', value: rush.solved },
              { label: 'Erreurs', value: `${rush.strikes}/${RUSH_MAX_STRIKES}` },
            ]}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Tag>{DIFFICULTY_LABELS[difficultyOf(puzzle.rating)]}</Tag>
            <Tag>{puzzle.rating} Elo</Tag>
          </div>
          <p className="text-body italic">
            {rush.solverColor === 'w' ? 'Les blancs jouent' : 'Les noirs jouent'} et gagnent.
          </p>
          {best > 0 && (
            <p className="text-caption italic text-ink-soft">Votre record : {puzzles(best)}.</p>
          )}
        </div>
      </div>
    </div>
  )
}
