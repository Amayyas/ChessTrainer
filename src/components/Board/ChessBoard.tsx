import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { DrawBrushes } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import '@lichess-org/chessground/assets/chessground.base.css'
import './board.css'
import BoardFrame from '@/components/Board/BoardFrame'
import PromotionPicker from '@/components/Board/PromotionPicker'
import { boardStyle } from '@/components/Board/boardTheme'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { board, durations } from '@/lib/design-tokens'
import { useBoardStore } from '@/store/useBoardStore'
import type { PieceSymbol, Square } from '@/utils/chess'
import { piecesOf } from '@/utils/fen'

export interface ChessBoardProps {
  fen: string
  turn: 'w' | 'b'
  orientation?: 'white' | 'black'
  /** Plays a move. Returns true if it was legal and applied. */
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  getLegalTargets: (square: Square) => Square[]
  isPromotion: (from: Square, to: Square) => boolean
  lastMove?: { from: Square; to: Square } | null
  checkSquare?: Square | null
  /** When false, nothing on the board can be moved. */
  interactive?: boolean
  /** The coach's suggestions, each drawn as an arrow from a square to another. */
  arrows?: Array<[Square, Square]>
  /**
   * A diagram is only ever looked at: chessground then binds no pointer events
   * at all. Unlike `interactive`, it is fixed for the board's lifetime.
   */
  diagram?: boolean
  /** What the board shows, for assistive technology. */
  label?: string
}

/**
 * The board, drawn by chessground as a chess column prints its diagram: the
 * hatched squares in a double frame, the coordinates outside it, the mpchess
 * pieces, and the rubric for the move just played, a check and the coach's
 * arrow. A piece is moved by dragging it or by clicking it and then its
 * square; a pawn reaching the last rank asks for its piece.
 *
 * chessground draws into a DOM node it owns, so it is made once, when the
 * board mounts, and every change of position or of state reaches it through
 * `set`. Its move handler is bound at that moment too, which is why it reads
 * the latest props through a ref.
 */
export default function ChessBoard({
  fen,
  turn,
  orientation = 'white',
  onMove,
  getLegalTargets,
  isPromotion,
  lastMove,
  checkSquare,
  interactive = true,
  arrows,
  diagram = false,
  label = 'Échiquier',
}: ChessBoardProps) {
  const reduceMotion = usePrefersReducedMotion()
  // A diagram is the printed figure and keeps its hatching; the boards one
  // plays on follow the player's choice.
  const squares = useBoardStore((state) => state.squares)
  const wrapRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null)

  const latest = useRef({ fen, onMove, isPromotion })
  latest.current = { fen, onMove, isPromotion }

  const color = turn === 'w' ? 'white' : 'black'

  const dests = useMemo(() => {
    const map = new Map<Key, Key[]>()
    if (!interactive || diagram) return map
    for (const [square, piece] of piecesOf(fen)) {
      if (piece.color !== turn) continue
      const targets = getLegalTargets(square)
      if (targets.length > 0) map.set(square, targets)
    }
    return map
  }, [fen, turn, interactive, diagram, getLegalTargets])

  const config = useMemo<Config>(
    () => ({
      fen,
      orientation,
      turnColor: color,
      lastMove: lastMove ? [lastMove.from, lastMove.to] : undefined,
      check: Boolean(checkSquare),
      movable: {
        free: false,
        color: interactive && !diagram ? color : undefined,
        dests,
        showDests: true,
      },
      draggable: { enabled: interactive && !diagram, showGhost: true },
      selectable: { enabled: interactive && !diagram },
      animation: { enabled: !reduceMotion, duration: durations.piece },
      drawable: {
        autoShapes: (arrows ?? []).map(([orig, dest]) => ({ orig, dest, brush: 'coach' })),
      },
    }),
    [
      fen,
      orientation,
      color,
      lastMove,
      checkSquare,
      interactive,
      diagram,
      dests,
      reduceMotion,
      arrows,
    ],
  )

  const initial = useRef(config)

  useEffect(() => {
    if (!wrapRef.current) return
    const api = Chessground(wrapRef.current, {
      ...initial.current,
      coordinates: false,
      viewOnly: diagram,
      disableContextMenu: true,
      highlight: { lastMove: true, check: true },
      premovable: { enabled: false },
      predroppable: { enabled: false },
      movable: {
        ...initial.current.movable,
        events: {
          after: (orig, dest) => {
            const { onMove: move, isPromotion: promotes, fen: position } = latest.current
            const from = orig as Square
            const to = dest as Square
            if (promotes(from, to)) {
              setPromotion({ from, to })
              return
            }
            // A move the game refuses goes back where it came from.
            if (!move(from, to)) api.set({ fen: position })
          },
        },
      },
      drawable: {
        enabled: false,
        visible: true,
        // chessground merges the brushes it is given into its own set, so the
        // coach's is the only one named here.
        brushes: {
          coach: {
            key: 'coach',
            color: board.arrow.colour,
            opacity: board.arrow.opacity,
            lineWidth: 10,
          },
        } as Partial<DrawBrushes> as DrawBrushes,
        autoShapes: initial.current.drawable?.autoShapes,
      },
    })
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [diagram])

  useEffect(() => {
    apiRef.current?.set(config)
  }, [config])

  // A new position from outside — the engine's reply, an undo — drops whatever
  // was half done on the old one.
  useEffect(() => {
    apiRef.current?.selectSquare(null)
    setPromotion(null)
  }, [fen])

  const choosePromotion = (piece: PieceSymbol) => {
    const pending = promotion
    setPromotion(null)
    if (pending && !latest.current.onMove(pending.from, pending.to, piece)) {
      apiRef.current?.set({ fen: latest.current.fen })
    }
  }

  const cancelPromotion = () => {
    setPromotion(null)
    apiRef.current?.set({ fen: latest.current.fen })
  }

  return (
    <BoardFrame
      orientation={orientation}
      style={boardStyle(diagram ? 'hatched' : squares, reduceMotion)}
    >
      <div ref={wrapRef} role="img" aria-label={label} className="cg-wrap" />
      {promotion && (
        <PromotionPicker
          square={promotion.to}
          color={color}
          orientation={orientation}
          onChoose={choosePromotion}
          onCancel={cancelPromotion}
        />
      )}
    </BoardFrame>
  )
}
