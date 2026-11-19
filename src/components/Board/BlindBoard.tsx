import Notation from '@/components/UI/Notation'
import { useSpokenMoves } from '@/components/Board/useSpokenMoves'
import type { SpokenMove } from '@/utils/describeBoard'
import { moveNumberIn } from '@/utils/notation'

/** What a blind board needs of a move: what is said, and the position it was played in. */
export interface BlindMove extends SpokenMove {
  before: string
}

export interface BlindBoardProps {
  /** The moves played so far, as chess.js gives them. */
  moves: ReadonlyArray<BlindMove>
  /** Side to move, for the line shown before any move is played. */
  turn: 'w' | 'b'
}

/**
 * The board of a blindfold game: no diagram, only the last move, printed large
 * as a column prints the move it is discussing, and said to a screen reader as
 * the drawn board says it. The game is followed in the head, and played by
 * typing moves into the field below.
 */
export default function BlindBoard({ moves, turn }: BlindBoardProps) {
  const spoken = useSpokenMoves(moves)
  const last = moves.at(-1)

  return (
    <section
      aria-labelledby="t-blind"
      className="flex aspect-square w-full flex-col items-center justify-center gap-3 border border-ink/30 bg-paper-bright px-6 text-center"
    >
      <h2 id="t-blind" className="text-kicker font-semibold uppercase">
        Partie à l’aveugle
      </h2>
      {last ? (
        <>
          <p className="text-caption italic text-ink-soft">Dernier coup</p>
          <p className="text-title leading-none sm:text-headline">
            {moveNumberIn(last.before)}
            <Notation san={last.san} />
          </p>
        </>
      ) : (
        <p className="text-body italic">
          Aucun coup joué. Trait aux {turn === 'w' ? 'blancs' : 'noirs'}.
        </p>
      )}
      <p className="text-caption italic text-ink-soft">
        Suivez la position de tête, et jouez en tapant votre coup ci-dessous.
      </p>
      <p aria-live="polite" className="sr-only">
        {spoken}
      </p>
    </section>
  )
}
