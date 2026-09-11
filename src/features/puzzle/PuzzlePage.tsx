import { useState, type ReactNode } from 'react'
import { ChessBoard } from '@/components/Board'
import { Badge, Button, Card, PageHeader } from '@/components/UI'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
import { DAILY_COUNT } from '@/features/puzzle/dailySet'
import { HINT_COST, scorePuzzle, type PuzzleRunner } from '@/features/puzzle/usePuzzleRunner'
import { usePuzzleSession } from '@/features/puzzle/usePuzzleSession'
import { usePracticeSession } from '@/features/puzzle/usePracticeSession'
import { DIFFICULTIES, DIFFICULTY_LABELS, difficultyOf, themeLabel } from '@/features/puzzle/types'
import type { Puzzle } from '@/features/puzzle/types'
import { cn } from '@/utils/cn'

/** Seconds, or m:ss once past a minute. */
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')}`
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition-colors',
        selected
          ? 'border-or bg-or/15 font-semibold text-ebene'
          : 'border-ebene/15 text-ardoise hover:border-ebene/30 hover:text-ebene',
      )}
    >
      {children}
    </button>
  )
}

/** The board and its side card — shared by the daily series and free practice. */
function PuzzleBoard({
  runner,
  puzzle,
  solvedActions,
}: {
  runner: PuzzleRunner
  puzzle: Puzzle
  solvedActions: ReactNode
}) {
  const difficulty = difficultyOf(puzzle.rating)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="mx-auto w-full max-w-[560px] self-start">
        {/* Green on a correct move, red on a wrong one. */}
        <div
          className={cn(
            'rounded-md ring-4 transition-colors duration-200',
            runner.feedback === 'correct' && 'ring-emerald-500',
            runner.feedback === 'wrong' && 'ring-red-500',
            !runner.feedback && 'ring-transparent',
          )}
        >
          <ChessBoard
            fen={runner.fen}
            turn={runner.solverColor}
            orientation={runner.solverColor === 'w' ? 'white' : 'black'}
            interactive={!runner.isSolved}
            onMove={runner.attempt}
            getLegalTargets={runner.getLegalTargets}
            isPromotion={runner.isPromotion}
            lastMove={runner.lastMove}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold">{themeLabel(puzzle.theme)}</Badge>
            <Badge variant="neutral">{DIFFICULTY_LABELS[difficulty]}</Badge>
            <Badge variant="neutral">{puzzle.rating} Elo</Badge>
          </div>

          <p className="text-sm text-ardoise">
            {runner.solverColor === 'w' ? 'Les blancs jouent' : 'Les noirs jouent'} et gagnent.
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-ebene/5 px-2 py-1.5">
              <p className="font-display text-lg font-bold text-ebene">
                {formatDuration(runner.elapsedMs)}
              </p>
              <p className="text-ardoise">Temps</p>
            </div>
            <div className="rounded-lg bg-ebene/5 px-2 py-1.5">
              <p className="font-display text-lg font-bold text-ebene">{runner.errors}</p>
              <p className="text-ardoise">Erreurs</p>
            </div>
            <div className="rounded-lg bg-ebene/5 px-2 py-1.5">
              <p className="font-display text-lg font-bold text-ebene">
                {scorePuzzle(runner.errors, runner.hintLevel)}
              </p>
              <p className="text-ardoise">Points</p>
            </div>
          </div>

          {runner.isSolved ? (
            <div className="flex flex-col gap-3">
              <Badge variant="success">Résolu !</Badge>
              {solvedActions}
            </div>
          ) : (
            <div>
              <h2 className="mb-2 font-display text-lg font-bold text-ebene">Indices</h2>
              {runner.hintLevel === 0 ? (
                <p className="text-sm text-ardoise">
                  Bloqué ? Chaque indice coûte {HINT_COST} points.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-ebene">
                  {runner.hintMessages.slice(0, runner.hintLevel).map((message, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-semibold text-or">{i + 1}.</span>
                      {message}
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                disabled={runner.hintLevel >= 3}
                onClick={runner.revealHint}
              >
                {runner.hintLevel === 0
                  ? 'Demander un indice'
                  : runner.hintLevel >= 3
                    ? 'Tous les indices révélés'
                    : `Indice suivant (−${HINT_COST} pts)`}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function DailyView() {
  const session = usePuzzleSession()
  const { puzzle, progress } = session

  const streakBadge = (
    <Badge variant={progress.streak > 0 ? 'gold' : 'neutral'}>
      Série : {progress.streak} jour{progress.streak > 1 ? 's' : ''}
    </Badge>
  )

  if (session.isSessionOver || !puzzle) {
    const solved = session.scores.length
    return (
      <div>
        <PageHeader title="Puzzles" subtitle="Série du jour terminée." actions={streakBadge} />
        <Card className="mx-auto flex max-w-xl flex-col gap-4">
          <h2 className="font-display text-xl font-bold text-ebene">Bilan de la série</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ebene/5 px-3 py-2">
              <p className="font-display text-2xl font-bold text-ebene">{session.totalPoints}</p>
              <p className="text-xs text-ardoise">Points</p>
            </div>
            <div className="rounded-xl bg-ebene/5 px-3 py-2">
              <p className="font-display text-2xl font-bold text-ebene">
                {solved}/{DAILY_COUNT}
              </p>
              <p className="text-xs text-ardoise">Résolus</p>
            </div>
            <div className="rounded-xl bg-ebene/5 px-3 py-2">
              <p className="font-display text-2xl font-bold text-ebene">{progress.bestStreak}</p>
              <p className="text-xs text-ardoise">Meilleure série</p>
            </div>
          </div>

          <ol className="divide-y divide-ebene/10 text-sm">
            {session.scores.map((score, index) => (
              <li key={score.puzzleId} className="flex items-center justify-between py-2">
                <span className="text-ardoise">Puzzle {index + 1}</span>
                <span className="text-ebene">
                  {score.points} pts · {formatDuration(score.elapsedMs)} · {score.errors} erreur
                  {score.errors > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ol>

          <Button onClick={session.restart}>Rejouer la série</Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Puzzles"
        subtitle={`Puzzle ${session.index + 1} sur ${session.puzzles.length} — trouvez le meilleur coup.`}
        actions={streakBadge}
      />
      <PuzzleBoard
        runner={session}
        puzzle={puzzle}
        solvedActions={
          <Button onClick={session.next}>
            {session.index + 1 >= session.puzzles.length ? 'Voir le bilan' : 'Puzzle suivant'}
          </Button>
        }
      />
    </div>
  )
}

function PracticeView() {
  const session = usePracticeSession()

  const picker = (
    <ToggleGroup
      type="single"
      variant="plain"
      value={session.difficulty}
      // There is no "no difficulty": pressing the chosen band again would leave
      // the practice session with nothing to draw puzzles from.
      onValueChange={(next) => {
        if (next) session.setDifficulty(next as (typeof DIFFICULTIES)[number])
      }}
      aria-label="Difficulté"
      className="flex flex-wrap gap-2"
    >
      {DIFFICULTIES.map((band) => (
        <ToggleGroupItem key={band} value={band} className="rounded-full py-1 text-center">
          {DIFFICULTY_LABELS[band]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  return (
    <div>
      <PageHeader
        title="Puzzles"
        subtitle={`Entraînement libre — ${session.solved} résolu${session.solved > 1 ? 's' : ''}, ${session.totalPoints} pts.`}
        actions={picker}
      />
      {session.puzzle ? (
        <PuzzleBoard
          runner={session}
          puzzle={session.puzzle}
          solvedActions={<Button onClick={session.next}>Puzzle suivant</Button>}
        />
      ) : (
        <Card className="mx-auto max-w-xl text-center">
          <p className="text-ardoise">
            Vous avez résolu tous les puzzles {DIFFICULTY_LABELS[session.difficulty].toLowerCase()}{' '}
            de cette session. Changez de difficulté pour continuer.
          </p>
        </Card>
      )}
    </div>
  )
}

/**
 * Puzzle mode: a daily series that feeds the streak, and a free-practice tab
 * with no daily cap. Both share the board, hints and scoring.
 */
export default function PuzzlePage() {
  const [tab, setTab] = useState<'daily' | 'practice'>('daily')
  // Mount practice the first time its tab is opened, then keep both views alive
  // so switching tabs never throws away a series or a practice run in progress.
  const [practiceOpened, setPracticeOpened] = useState(false)
  if (tab === 'practice' && !practiceOpened) setPracticeOpened(true)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="group" aria-label="Mode de jeu">
        <Pill selected={tab === 'daily'} onClick={() => setTab('daily')}>
          Série du jour
        </Pill>
        <Pill selected={tab === 'practice'} onClick={() => setTab('practice')}>
          Entraînement libre
        </Pill>
      </div>
      <div hidden={tab !== 'daily'}>
        <DailyView />
      </div>
      {practiceOpened && (
        <div hidden={tab !== 'practice'}>
          <PracticeView />
        </div>
      )}
    </div>
  )
}
