import { useEffect, useMemo, useRef } from 'react'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@/components/Board/board.css'
import BoardFrame from '@/components/Board/BoardFrame'
import { boardStyle } from '@/components/Board/boardTheme'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { durations } from '@/lib/design-tokens'
import { useBoardStore } from '@/store/useBoardStore'
import { huntPlacement, type ChampionType, type EnemyType } from '@/features/hunt/board'

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
  const apiRef = useRef<Api | null>(null)

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

  const initial = useRef(config)

  useEffect(() => {
    if (!wrapRef.current) return
    const api = Chessground(wrapRef.current, {
      ...initial.current,
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
    })
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [])

  useEffect(() => {
    apiRef.current?.set(config)
  }, [config])

  return (
    <BoardFrame style={boardStyle(squares, reduceMotion)}>
      <div ref={wrapRef} role="img" aria-label="Échiquier" className="cg-wrap" />
    </BoardFrame>
  )
}
