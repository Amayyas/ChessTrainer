import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { PromotionPieceOption, Square } from 'react-chessboard/dist/chessboard/types'
import type { PieceSymbol } from '@/utils/chess'

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
  /** When false, the board is display-only (no drag, no click-to-move). */
  interactive?: boolean
  /** Fixed pixel width. Omit to let the board size itself to its container. */
  boardWidth?: number
  /** Overlay arrows, e.g. the coach best-move suggestion. */
  arrows?: Array<[Square, Square, string?]>
}

// Board colours derived from the palette (spec section 4.1): ivory light squares,
// slate dark squares — both keep the SVG pieces legible.
const LIGHT_SQUARE = '#EDE6D8'
const DARK_SQUARE = '#4A4A5A'
const HIGHLIGHT_LAST = 'rgba(201, 168, 76, 0.42)'
const HIGHLIGHT_SELECTED = 'rgba(201, 168, 76, 0.55)'
const HIGHLIGHT_CHECK = 'rgba(220, 38, 38, 0.5)'
const TARGET_DOT = 'radial-gradient(circle, rgba(26,26,46,0.3) 22%, transparent 26%)'
const CAPTURE_RING =
  'radial-gradient(circle, transparent 55%, rgba(26,26,46,0.3) 56%, rgba(26,26,46,0.3) 62%, transparent 63%)'

/**
 * Reusable board (spec module M3): react-chessboard styled with the app palette,
 * drag-and-drop plus click-to-move, legal-move highlighting, and promotion
 * handled through the built-in dialog for both interaction styles.
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
  boardWidth,
  arrows,
}: ChessBoardProps) {
  const reduceMotion = useReducedMotion()
  const [selected, setSelected] = useState<Square | null>(null)
  const [targets, setTargets] = useState<Square[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(
    null,
  )

  // react-chessboard's own auto-sizing renders nothing until it observes a
  // pixel width, which is unreliable inside a CSS grid cell. We measure the
  // container ourselves and pass an explicit width, unless one is forced (tests).
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)

  useEffect(() => {
    if (boardWidth || !containerRef.current) return
    const element = containerRef.current
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setMeasuredWidth(Math.floor(width))
    })
    observer.observe(element)
    setMeasuredWidth(Math.floor(element.clientWidth))
    return () => observer.disconnect()
  }, [boardWidth])

  const effectiveWidth = boardWidth ?? measuredWidth

  const clearSelection = () => {
    setSelected(null)
    setTargets([])
  }

  // Any external position change (undo, reset, opponent move) drops the selection.
  useEffect(() => {
    setSelected(null)
    setTargets([])
    setPendingPromotion(null)
  }, [fen])

  const selectPiece = (square: Square): boolean => {
    const options = getLegalTargets(square)
    if (options.length === 0) return false
    setSelected(square)
    setTargets(options)
    return true
  }

  const commitMove = (from: Square, to: Square): boolean => {
    if (isPromotion(from, to)) {
      setPendingPromotion({ from, to })
      return true
    }
    const applied = onMove(from, to)
    if (applied) clearSelection()
    return applied
  }

  const handleSquareClick = (square: Square) => {
    if (!interactive || pendingPromotion) return

    if (selected) {
      if (square === selected) {
        clearSelection()
        return
      }
      if (targets.includes(square)) {
        commitMove(selected, square)
        return
      }
      // Not a legal target: try selecting another own piece, else clear.
      if (!selectPiece(square)) clearSelection()
      return
    }

    selectPiece(square)
  }

  const handlePieceDrop = (from: Square, to: Square): boolean => {
    if (!interactive) return false
    if (isPromotion(from, to)) {
      setPendingPromotion({ from, to })
      // Snap the piece back; the promotion dialog drives the real move.
      return false
    }
    return onMove(from, to)
  }

  const handlePromotionSelect = (piece?: PromotionPieceOption): boolean => {
    const pending = pendingPromotion
    setPendingPromotion(null)
    clearSelection()
    if (!piece || !pending) return false
    const symbol = piece.charAt(1).toLowerCase() as PieceSymbol
    return onMove(pending.from, pending.to, symbol)
  }

  const squareStyles = useMemo(() => {
    const styles: Record<string, Record<string, string>> = {}

    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: HIGHLIGHT_LAST }
      styles[lastMove.to] = { backgroundColor: HIGHLIGHT_LAST }
    }
    // Distinguish capture targets (ring) from empty targets (dot).
    for (const target of targets) {
      const image = fenHasPieceOn(fen, target) ? CAPTURE_RING : TARGET_DOT
      styles[target] = { ...styles[target], backgroundImage: image }
    }
    if (selected) {
      styles[selected] = { ...styles[selected], backgroundColor: HIGHLIGHT_SELECTED }
    }
    if (checkSquare) {
      styles[checkSquare] = { ...styles[checkSquare], backgroundColor: HIGHLIGHT_CHECK }
    }
    return styles
  }, [lastMove, targets, selected, checkSquare, fen])

  return (
    <div
      ref={containerRef}
      // No overflow-hidden/rounding: it clipped the edge rank/file coordinates.
      className="aspect-square w-full rounded-md shadow-card"
    >
      {effectiveWidth ? (
        <Chessboard
          position={fen}
          boardWidth={effectiveWidth}
          boardOrientation={orientation}
          arePiecesDraggable={interactive}
          onPieceDrop={handlePieceDrop}
          onSquareClick={handleSquareClick}
          onPromotionCheck={() => false}
          showPromotionDialog={pendingPromotion !== null}
          promotionToSquare={pendingPromotion?.to ?? undefined}
          onPromotionPieceSelect={handlePromotionSelect}
          customBoardStyle={{ borderRadius: '0' }}
          customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
          customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
          customSquareStyles={squareStyles}
          // Pass an empty array (not undefined) to clear: react-chessboard keeps
          // the previous arrows when customArrows becomes undefined.
          customArrows={arrows ?? []}
          customArrowColor="#C9A84C"
          animationDuration={reduceMotion ? 0 : 200}
          arePremovesAllowed={false}
          id={`board-${turn}`}
        />
      ) : null}
    </div>
  )
}

/** Reads whether a FEN placement has any piece on the given square. */
function fenHasPieceOn(fen: string, square: Square): boolean {
  const placement = fen.split(' ')[0] ?? ''
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const rank = 8 - Number(square.charAt(1))
  const rows = placement.split('/')
  const row = rows[rank]
  if (!row) return false

  let col = 0
  for (const char of row) {
    if (/\d/.test(char)) {
      col += Number(char)
    } else {
      if (col === file) return true
      col += 1
    }
    if (col > file) break
  }
  return false
}
