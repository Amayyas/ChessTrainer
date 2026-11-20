import { Chess } from 'chess.js'
import { useState } from 'react'
import { BoardControls, ChessBoard, MoveInput } from '@/components/Board'
import { Box, Button, PageHeader, Tag } from '@/components/UI'
import Notation from '@/components/UI/Notation'
import { isPlayable } from '@/features/puzzle/collectMistakes'
import { duePuzzles, type MistakePuzzle } from '@/features/puzzle/mistakes'
import { dayKey } from '@/features/puzzle/progress'
import { useMistakeSession } from '@/features/puzzle/useMistakeSession'
import { useProgressionStore } from '@/store/useProgressionStore'
import type { Square } from '@/utils/chess'

const PANEL_HEAD = 'text-kicker font-semibold uppercase'
const DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/** A move's number in the score, from the position it is played in: "12." or "12…". */
function numberIn(fen: string): string {
  const [, turn, , , , fullmove] = fen.split(' ')
  return `${fullmove ?? '1'}${turn === 'b' ? '…' : '.'}`
}

/**
 * A UCI move as SAN, or null when it is not a legal move in `fen`: the list
 * comes back from the server, and a corrupt entry must not break the page.
 */
function sanOf(fen: string, uci: string): string | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      .san
  } catch {
    return null
  }
}

const VERDICTS = {
  right: {
    tone: 'ink',
    label: 'Bien trouvé',
    text: 'Ce coup tient la position. À revoir plus tard.',
  },
  wrong: { tone: 'alert', label: 'Pas encore', text: 'Ce coup perd encore trop. À revoir demain.' },
  unchecked: {
    tone: 'muted',
    label: 'Non vérifié',
    text: 'L’IA n’a pas pu juger ce coup. Cette erreur reste à revoir.',
  },
} as const

function MistakeBoard({ puzzle, onNext }: { puzzle: MistakePuzzle; onNext: () => void }) {
  const session = useMistakeSession(puzzle)
  const side = puzzle.fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const solving = session.status === 'solving'
  const verdict =
    session.status === 'solving' || session.status === 'checking' ? null : VERDICTS[session.status]
  const decided = verdict !== null
  const best = [puzzle.best.slice(0, 2), puzzle.best.slice(2, 4)] as [Square, Square]
  const bestSan = sanOf(puzzle.fen, puzzle.best)

  return (
    <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
      <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
        <ChessBoard
          fen={session.fen}
          turn={side}
          orientation={side === 'w' ? 'white' : 'black'}
          interactive={solving}
          onMove={session.attempt}
          getLegalTargets={session.getLegalTargets}
          isPromotion={session.isPromotion}
          arrows={session.status === 'wrong' ? [best] : []}
        />
        <BoardControls>
          <MoveInput
            fen={session.fen}
            turn={side}
            enabled={solving}
            onMove={session.attempt}
            getLegalTargets={session.getLegalTargets}
            isPromotion={session.isPromotion}
            idleMessage="Réponse jouée."
          />
        </BoardControls>
      </div>

      <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
        <div>
          <h2 className={PANEL_HEAD}>Votre erreur</h2>
          <p className="mt-1 text-body">
            Dans cette position, vous aviez joué {numberIn(puzzle.fen)}
            <Notation san={puzzle.played} />. Trouvez mieux.
          </p>
        </div>

        <div role="status" className="flex flex-col items-start gap-2">
          {session.status === 'checking' && (
            <p className="text-caption italic text-ink-soft">L’IA examine votre coup…</p>
          )}
          {verdict && (
            <>
              <Tag tone={verdict.tone}>{verdict.label}</Tag>
              <p className="text-body italic">{verdict.text}</p>
              {session.status === 'wrong' && (
                <p className="text-caption">
                  Le coup de l’IA : {numberIn(puzzle.fen)}
                  {bestSan ? <Notation san={bestSan} /> : `${best[0]}–${best[1]}`}, fléché sur le
                  plateau.
                </p>
              )}
            </>
          )}
        </div>

        {decided && (
          <div>
            <Button size="sm" onClick={onNext}>
              Erreur suivante
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The player's own mistakes, set again on their review schedule. The one on
 * the board stays until the player moves on, even once its review has moved it
 * off today's list.
 */
export default function MistakesView() {
  const mistakes = useProgressionStore((state) => state.puzzleProgress.mistakes)
  const due = duePuzzles(mistakes, dayKey()).filter(isPlayable)
  const [current, setCurrent] = useState<MistakePuzzle | null>(null)
  const shown = current ?? due[0] ?? null
  // Pinned as soon as it is shown. Answering it reschedules it off today's
  // list, and read from the list it would be swapped for the next one before
  // its verdict is seen.
  if (shown && current === null) setCurrent(shown)

  const subtitle =
    mistakes.length === 0
      ? 'Mes erreurs — aucune pour l’instant.'
      : `Mes erreurs — ${due.length} à revoir aujourd’hui, ${mistakes.length} en tout.`

  if (!shown) {
    const next = [...mistakes].sort((a, b) => a.due.localeCompare(b.due))[0]
    return (
      <div>
        <PageHeader title="Puzzles" subtitle={subtitle} />
        <Box className="mx-auto max-w-xl">
          <p className="text-body">
            {mistakes.length === 0
              ? 'Les erreurs et les gaffes que le Coach relève dans vos parties analysées arrivent ici, pour être rejouées jusqu’à ce que le bon coup vienne tout seul.'
              : `Rien à revoir aujourd’hui. Prochaine erreur à revoir le ${DAY.format(new Date(`${next!.due}T12:00:00`))}.`}
          </p>
        </Box>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Puzzles" subtitle={subtitle} />
      <MistakeBoard
        key={shown.id}
        puzzle={shown}
        onNext={() => setCurrent(due.find((puzzle) => puzzle.id !== shown.id) ?? null)}
      />
    </div>
  )
}
