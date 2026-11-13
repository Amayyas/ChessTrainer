import { useEffect, useMemo, useState } from 'react'
import type { OpeningReading, PlayedMove } from '@/features/coach/openings'

type ReadOpening = (moves: readonly PlayedMove[]) => OpeningReading | null

/**
 * The opening of the moves on the board, once the book has loaded.
 *
 * The book is 40 kB gzipped, four times the rest of the coach, so it is
 * fetched after the page renders rather than with it: the board and the
 * engine are what a player waits for, and the opening can arrive a moment
 * later. Null until it has, and for good if it cannot be fetched — the coach
 * then says nothing about the opening rather than something wrong.
 */
export function useOpening(moves: readonly PlayedMove[]): OpeningReading | null {
  const [read, setRead] = useState<ReadOpening | null>(null)

  useEffect(() => {
    let live = true
    import('@/features/coach/openings')
      .then((module) => {
        // A function in state must be wrapped, or React would call it as an updater.
        if (live) setRead(() => module.readOpening)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  return useMemo(() => (read ? read(moves) : null), [read, moves])
}
