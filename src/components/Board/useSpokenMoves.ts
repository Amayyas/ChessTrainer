import { useEffect, useRef, useState } from 'react'
import { describeNewMoves, sameMoves, type SpokenMove } from '@/utils/describeBoard'

/**
 * The text of the live region: the moves added since the last render, said
 * once each. A screen reader speaks a region only when its text changes, so
 * the same move twice — played, taken back, played again — alternates a
 * trailing no-break space, which it does not read, to change the text.
 */
export function useSpokenMoves(moves: ReadonlyArray<SpokenMove> | undefined): string {
  const [spoken, setSpoken] = useState({ text: '', count: 0 })
  const previous = useRef(moves ?? [])
  useEffect(() => {
    const before = previous.current
    previous.current = moves ?? []
    // A page may hand over the same moves in a new array at each render.
    if (!moves || sameMoves(before, moves)) return
    const said = describeNewMoves(before, moves)
    setSpoken((last) =>
      said ? { text: said, count: last.count + 1 } : last.text ? { ...last, text: '' } : last,
    )
  }, [moves])
  return spoken.text && `${spoken.text}${spoken.count % 2 ? '\u00a0' : ''}`
}
