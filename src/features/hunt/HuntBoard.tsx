import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import BoardFrame from '@/components/Board/BoardFrame'
import { boardStyle } from '@/components/Board/boardTheme'
import { useChessground } from '@/components/Board/useChessground'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { durations } from '@/lib/design-tokens'
import { useBoardStore } from '@/store/useBoardStore'
import { huntPlacement, type ChampionType, type EnemyType } from '@/features/hunt/board'
import { describeHunt, describeTaken, describeThreats } from '@/utils/describeBoard'

export interface HuntBoardProps {
  champion: ChampionType
  /** Null while the champion has been eaten and has not reappeared yet. */
  championSquare: string | null
  enemies: ReadonlyMap<string, EnemyType>
  /** Squares the champion can reach. */
  moves: string[]
  /** Enemies that could take the champion where it stands. */
  threats: string[]
  onMove: (square: string) => void
  interactive?: boolean
}

/**
 * The text of the urgent live region. A screen reader speaks a region only
 * when its text changes, so the same danger met again on another square — the
 * same bishop, the champion moved along its diagonal — alternates a trailing
 * no-break space, which it does not read, to change the text.
 */
function useAlert(urgent: string, championSquare: string | null): string {
  const [alert, setAlert] = useState({ text: '', count: 0 })
  useEffect(() => {
    setAlert((last) =>
      urgent ? { text: urgent, count: last.count + 1 } : last.text ? { ...last, text: '' } : last,
    )
  }, [urgent, championSquare])
  return alert.text && `${alert.text}${alert.count % 2 ? '\u00a0' : ''}`
}

/**
 * The arcade board, drawn by chessground as the other boards are. chessground
 * moves nothing itself here: a click on a square the champion can reach sends
 * it there, one click, as a piece that is always picked up, and the hunt's
 * engine answers with the new position.
 *
 * Only the empty squares the champion can reach are dotted: ringing an enemy
 * it could take would hand the player the next move, which is not the point of
 * the exercise. The enemies that can take the champion are tinted in the
 * rubric, and so is the champion while it is in danger.
 */
export default function HuntBoard({
  champion,
  championSquare,
  enemies,
  moves,
  threats,
  onMove,
  interactive = true,
}: HuntBoardProps) {
  const reduceMotion = usePrefersReducedMotion()
  const squares = useBoardStore((state) => state.squares)
  const wrapRef = useRef<HTMLDivElement>(null)

  // The click handler is bound once, when chessground is made, so it reads the
  // latest props through a ref.
  const latest = useRef({ moves, onMove, interactive })
  latest.current = { moves, onMove, interactive }

  const config = useMemo<Config>(() => {
    const marks = new Map<Key, string>()
    for (const square of moves) {
      if (!enemies.has(square)) marks.set(square as Key, 'hunt-reach')
    }
    for (const square of threats) marks.set(square as Key, 'hunt-threat')
    if (championSquare) {
      marks.set(
        championSquare as Key,
        threats.length > 0 ? 'hunt-champion hunt-danger' : 'hunt-champion',
      )
    }
    return {
      fen: huntPlacement(champion, championSquare, enemies),
      animation: { enabled: !reduceMotion, duration: durations.piece },
      highlight: { lastMove: false, check: false, custom: marks },
    }
  }, [champion, championSquare, enemies, moves, threats, reduceMotion])

  useChessground(wrapRef, config, (current) => ({
    ...current,
    coordinates: false,
    disableContextMenu: true,
    // A swipe on the board is a move being aimed, not the page scrolling.
    blockTouchScroll: true,
    movable: { free: false, color: undefined },
    draggable: { enabled: false },
    selectable: { enabled: false },
    premovable: { enabled: false },
    predroppable: { enabled: false },
    drawable: { enabled: false, visible: false },
    events: {
      select: (key) => {
        const { moves: reachable, onMove: move, interactive: live } = latest.current
        if (live && reachable.includes(key)) move(key)
      },
    },
  }))

  // The board in words for a screen reader: the round as the description, and
  // what cannot wait in a live region — the danger the moment an enemy can take
  // the champion, and the champion taken when it was.
  const describedBy = useId()
  const description = useMemo(
    () => describeHunt(champion, championSquare, enemies, threats),
    [champion, championSquare, enemies, threats],
  )
  const urgent = useMemo(
    () => (championSquare ? describeThreats(enemies, threats) : describeTaken(champion)),
    [champion, championSquare, enemies, threats],
  )
  const said = useAlert(urgent, championSquare)

  return (
    <BoardFrame style={boardStyle(squares, reduceMotion)}>
      <div
        ref={wrapRef}
        role="img"
        aria-label="Échiquier"
        aria-describedby={describedBy}
        className="cg-wrap"
      />
      <p id={describedBy} hidden>
        {description}
      </p>
      <p aria-live="assertive" className="sr-only">
        {said}
      </p>
    </BoardFrame>
  )
}
