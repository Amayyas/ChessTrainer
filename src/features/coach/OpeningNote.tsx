import Notation from '@/components/UI/Notation'
import type { OpeningReading } from '@/features/coach/openings'

interface OpeningNoteProps {
  reading: OpeningReading
  /** The moves the reading was taken from, in English SAN. */
  sanMoves: readonly string[]
  className?: string
}

/** A move as the column numbers it: "7." for White's seventh, "7…" for Black's. */
function moveNumber(ply: number): string {
  return `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'}`
}

/**
 * The opening the game is in and where it left theory, set under a column
 * head as the paper prints a game's heading: the ECO code, then the name.
 */
export default function OpeningNote({ reading, sanMoves, className }: OpeningNoteProps) {
  const { opening, exitPly } = reading
  const exitSan = exitPly === null ? undefined : sanMoves[exitPly]

  return (
    <section aria-labelledby="t-opening" className={className}>
      <h2 id="t-opening" className="text-kicker font-semibold uppercase">
        Ouverture
      </h2>
      <p className="mt-1 text-body">
        <span className="mr-2 text-caption text-ink-soft">{opening.eco}</span>
        {opening.name}
      </p>
      <p className="text-caption italic text-ink-soft">
        {exitPly === null || exitSan === undefined ? (
          'Toujours dans la théorie.'
        ) : (
          <>
            Sortie de la théorie au coup {moveNumber(exitPly)}
            <Notation san={exitSan} />.
          </>
        )}
      </p>
    </section>
  )
}
