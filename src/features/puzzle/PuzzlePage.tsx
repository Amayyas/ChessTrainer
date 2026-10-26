import { useState, type ReactNode } from 'react'
import { BoardControls, ChessBoard, MoveInput } from '@/components/Board'
import { Box, Button, PageHeader, Tag } from '@/components/UI'
import BoxScore from '@/components/UI/BoxScore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/Tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
import { DAILY_COUNT } from '@/features/puzzle/dailySet'
import { HINT_COST, scorePuzzle, type PuzzleRunner } from '@/features/puzzle/usePuzzleRunner'
import { usePuzzleSession } from '@/features/puzzle/usePuzzleSession'
import { usePracticeSession } from '@/features/puzzle/usePracticeSession'
import { DIFFICULTIES, DIFFICULTY_LABELS, difficultyOf, themeLabel } from '@/features/puzzle/types'
import type { Puzzle } from '@/features/puzzle/types'
import { cn } from '@/utils/cn'
import HintList from '@/components/HintList'

/** Seconds, or m:ss once past a minute. */
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')}`
}

const PANEL_HEAD = 'text-kicker font-semibold uppercase'

/** The board and its side panel — shared by the daily series and free practice. */
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
    <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
      <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
        {/* The frame answers the move: ink for a right one, the rubric for a
            wrong one. Said in words too, for a screen reader, which the frame
            alone never told. */}
        <div
          className={cn(
            'outline outline-[3px] outline-offset-[3px]',
            runner.feedback === 'correct' && 'outline-ink',
            runner.feedback === 'wrong' && 'outline-rubric',
            !runner.feedback && 'outline-transparent',
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
            moves={runner.played}
          />
        </div>
        <BoardControls>
          <MoveInput
            fen={runner.fen}
            turn={runner.solverColor}
            enabled={!runner.isSolved}
            onMove={runner.attempt}
            getLegalTargets={runner.getLegalTargets}
            isPromotion={runner.isPromotion}
            idleMessage="Ce puzzle est résolu."
          />
        </BoardControls>
        <p role="status" className="sr-only">
          {runner.feedback === 'correct'
            ? 'Bon coup.'
            : runner.feedback === 'wrong'
              ? 'Ce n’est pas le coup attendu.'
              : ''}
        </p>
      </div>

      <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Tag>{themeLabel(puzzle.theme)}</Tag>
          <Tag>{DIFFICULTY_LABELS[difficulty]}</Tag>
          <Tag>{puzzle.rating} Elo</Tag>
        </div>

        <p className="text-body italic">
          {runner.solverColor === 'w' ? 'Les blancs jouent' : 'Les noirs jouent'} et gagnent.
        </p>

        <BoxScore
          phoneColumns={3}
          figures={[
            { label: 'Temps', value: formatDuration(runner.elapsedMs) },
            { label: 'Erreurs', value: runner.errors },
            { label: 'Points', value: scorePuzzle(runner.errors, runner.hintLevel) },
          ]}
        />

        {runner.isSolved ? (
          <div className="flex flex-col items-start gap-3">
            <Tag tone="ink">Résolu !</Tag>
            {solvedActions}
          </div>
        ) : (
          <Box className="px-[22px] pb-4 pt-5">
            <h2 className={cn(PANEL_HEAD, 'mb-2.5')}>Indices</h2>
            {runner.hintLevel === 0 ? (
              <p className="text-caption italic text-ink-soft">
                Bloqué ? Chaque indice coûte {HINT_COST} points.
              </p>
            ) : (
              <HintList hints={runner.hintMessages.slice(0, runner.hintLevel)} />
            )}
            <Button
              variant="quiet"
              size="sm"
              className="mt-1.5"
              disabled={runner.hintLevel >= 3}
              onClick={runner.revealHint}
            >
              {runner.hintLevel === 0
                ? 'Demander un indice'
                : runner.hintLevel >= 3
                  ? 'Tous les indices révélés'
                  : `Indice suivant (−${HINT_COST} pts)`}
            </Button>
          </Box>
        )}
      </div>
    </div>
  )
}

function DailyView() {
  const session = usePuzzleSession()
  const { puzzle, progress } = session

  const streakBadge = (
    <Tag tone={progress.streak > 0 ? 'ink' : 'muted'}>
      Série : {progress.streak} jour{progress.streak > 1 ? 's' : ''}
    </Tag>
  )

  if (session.isSessionOver || !puzzle) {
    const solved = session.scores.length
    return (
      <div>
        <PageHeader title="Puzzles" subtitle="Série du jour terminée." actions={streakBadge} />
        <Box className="mx-auto flex max-w-xl flex-col gap-4">
          <h2 className={PANEL_HEAD}>Bilan de la série</h2>
          <BoxScore
            phoneColumns={3}
            figures={[
              { label: 'Points', value: session.totalPoints },
              { label: 'Résolus', value: `${solved}/${DAILY_COUNT}` },
              { label: 'Meilleure série', value: progress.bestStreak },
            ]}
          />

          <ol>
            {session.scores.map((score, index) => (
              <li
                key={score.puzzleId}
                className="flex items-baseline justify-between gap-3 border-t border-ink/30 py-2 text-caption first:border-t-0"
              >
                <span className="text-ink-soft">Puzzle {index + 1}</span>
                <span className="tabular-nums lining-nums">
                  {score.points} pts · {formatDuration(score.elapsedMs)} · {score.errors} erreur
                  {score.errors > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ol>

          <Button onClick={session.restart}>Rejouer la série</Button>
        </Box>
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
        <ToggleGroupItem key={band} value={band} className="min-h-11 py-1 text-center">
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
        <Box className="mx-auto max-w-xl text-center">
          <p className="italic text-ink-soft">
            Vous avez résolu tous les puzzles {DIFFICULTY_LABELS[session.difficulty].toLowerCase()}{' '}
            de cette session. Changez de difficulté pour continuer.
          </p>
        </Box>
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
    <Tabs
      value={tab}
      onValueChange={(next) => setTab(next as 'daily' | 'practice')}
      className="flex flex-col gap-4"
    >
      <TabsList aria-label="Mode de jeu">
        <TabsTrigger value="daily">Série du jour</TabsTrigger>
        <TabsTrigger value="practice">Entraînement libre</TabsTrigger>
      </TabsList>

      {/* forceMount and hidden together, and both are needed. Radix unmounts an
          inactive panel by default, which is what the flag above exists to
          prevent: switching tabs would throw away a series or a practice run in
          progress. But forceMount also stops Radix setting hidden — it computes
          it from the same flag — so without the explicit one here both panels
          would be on screen at once. The caller's props are spread after its
          own, so this wins. */}
      <TabsContent value="daily" forceMount hidden={tab !== 'daily'}>
        <DailyView />
      </TabsContent>
      {/* The panel is always rendered, and only the view inside it waits for
          the first visit. Gating the panel itself left the trigger's
          aria-controls pointing at an element that did not exist, because Radix
          emits that attribute whether or not the panel is there. */}
      <TabsContent value="practice" forceMount hidden={tab !== 'practice'}>
        {practiceOpened && <PracticeView />}
      </TabsContent>
    </Tabs>
  )
}
