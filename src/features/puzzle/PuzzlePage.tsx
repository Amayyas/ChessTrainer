import { useEffect, useRef } from 'react'
import { ChessBoard } from '@/components/Board'
import { Badge, Button, Card, PageHeader } from '@/components/UI'
import { DAILY_COUNT } from '@/features/puzzle/dailySet'
import { usePuzzleSession, HINT_COST, scorePuzzle } from '@/features/puzzle/usePuzzleSession'
import { DIFFICULTY_LABELS, difficultyOf, themeLabel } from '@/features/puzzle/types'
import { useProgressionStore } from '@/store/useProgressionStore'
import { cn } from '@/utils/cn'

/** Seconds, or m:ss once past a minute. */
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Puzzle mode (spec section 2.3): a daily series of tactical positions with
 * real-time validation, progressive hints, scoring and a daily streak.
 */
export default function PuzzlePage() {
  const session = usePuzzleSession()
  const { puzzle, feedback, progress } = session
  const recordPuzzle = useProgressionStore((state) => state.recordPuzzle)

  // Award XP for each newly solved puzzle, exactly once.
  const recordedCount = useRef(0)
  useEffect(() => {
    // Restarting the series clears the scores, so the marker rewinds with it.
    if (session.scores.length < recordedCount.current) recordedCount.current = 0
    if (session.scores.length === recordedCount.current) return

    const fresh = session.scores.slice(recordedCount.current)
    recordedCount.current = session.scores.length
    for (const score of fresh) {
      recordPuzzle({
        flawless: score.errors === 0 && score.hints === 0,
        streak: progress.streak,
      })
    }
  }, [session.scores, progress.streak, recordPuzzle])

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

  const difficulty = difficultyOf(puzzle.rating)

  return (
    <div>
      <PageHeader
        title="Puzzles"
        subtitle={`Puzzle ${session.index + 1} sur ${session.puzzles.length} — trouvez le meilleur coup.`}
        actions={streakBadge}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mx-auto w-full max-w-[560px] self-start">
          {/* Green on a correct move, red on a wrong one (spec section 2.3). */}
          <div
            className={cn(
              'rounded-md ring-4 transition-colors duration-200',
              feedback === 'correct' && 'ring-emerald-500',
              feedback === 'wrong' && 'ring-red-500',
              !feedback && 'ring-transparent',
            )}
          >
            <ChessBoard
              fen={session.fen}
              turn={session.solverColor}
              orientation={session.solverColor === 'w' ? 'white' : 'black'}
              interactive={!session.isSolved}
              onMove={session.attempt}
              getLegalTargets={session.getLegalTargets}
              isPromotion={session.isPromotion}
              lastMove={session.lastMove}
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
              {session.solverColor === 'w' ? 'Les blancs jouent' : 'Les noirs jouent'} et gagnent.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-ebene/5 px-2 py-1.5">
                <p className="font-display text-lg font-bold text-ebene">
                  {formatDuration(session.elapsedMs)}
                </p>
                <p className="text-ardoise">Temps</p>
              </div>
              <div className="rounded-lg bg-ebene/5 px-2 py-1.5">
                <p className="font-display text-lg font-bold text-ebene">{session.errors}</p>
                <p className="text-ardoise">Erreurs</p>
              </div>
              <div className="rounded-lg bg-ebene/5 px-2 py-1.5">
                <p className="font-display text-lg font-bold text-ebene">
                  {scorePuzzle(session.errors, session.hintLevel)}
                </p>
                <p className="text-ardoise">Points</p>
              </div>
            </div>

            {session.isSolved ? (
              <div className="flex flex-col gap-3">
                <Badge variant="success">Résolu !</Badge>
                <Button onClick={session.next}>
                  {session.index + 1 >= session.puzzles.length ? 'Voir le bilan' : 'Puzzle suivant'}
                </Button>
              </div>
            ) : (
              <div>
                <h2 className="mb-2 font-display text-lg font-bold text-ebene">Indices</h2>
                {session.hintLevel === 0 ? (
                  <p className="text-sm text-ardoise">
                    Bloqué ? Chaque indice coûte {HINT_COST} points.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm text-ebene">
                    {session.hintMessages.slice(0, session.hintLevel).map((message, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="font-semibold text-or">{index + 1}.</span>
                        {message}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  disabled={session.hintLevel >= 3}
                  onClick={session.revealHint}
                >
                  {session.hintLevel === 0
                    ? 'Demander un indice'
                    : session.hintLevel >= 3
                      ? 'Tous les indices révélés'
                      : `Indice suivant (−${HINT_COST} pts)`}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
