import { useMemo, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import type { BoardPosition, Piece, Square } from 'react-chessboard/dist/chessboard/types'
import { useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import type { ChampionType, EnemyType } from '@/features/hunt/board'

export interface HuntBoardProps {
  champion: ChampionType
  championSquare: string
  enemies: ReadonlyMap<string, EnemyType>
  /** Squares the champion can reach. */
  moves: string[]
  /** Enemies that could take the champion where it stands. */
  threats: string[]
  onMove: (square: string) => void
  interactive?: boolean
  boardWidth?: number
}

const LIGHT_SQUARE = '#EDE6D8'
const DARK_SQUARE = '#4A4A5A'
const CHAMPION_HIGHLIGHT = 'rgba(201, 168, 76, 0.55)'
const THREAT_HIGHLIGHT = 'rgba(220, 38, 38, 0.55)'
const TARGET_DOT = 'radial-gradient(circle, rgba(26,26,46,0.3) 22%, transparent 26%)'
const CAPTURE_RING =
  'radial-gradient(circle, transparent 55%, rgba(16,185,129,0.75) 56%, rgba(16,185,129,0.75) 64%, transparent 65%)'

/**
 * The arcade board (spec section 2.4). It holds a champion and loose enemies
 * rather than a legal chess position, so react-chessboard is driven with a
 * position object instead of a FEN.
 */
export default function HuntBoard({
  champion,
  championSquare,
  enemies,
  moves,
  threats,
  onMove,
  interactive = true,
  boardWidth,
}: HuntBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useMeasuredWidth(containerRef, boardWidth)

  const position = useMemo<BoardPosition>(() => {
    // Squares come from the arcade engine as plain strings; the board types them
    // as the algebraic union, which they always are.
    const board: Partial<Record<Square, Piece>> = {
      [championSquare as Square]: `w${champion.toUpperCase()}` as Piece,
    }
    for (const [square, piece] of enemies) {
      board[square as Square] = `b${piece.toUpperCase()}` as Piece
    }
    return board as BoardPosition
  }, [champion, championSquare, enemies])

  const squareStyles = useMemo(() => {
    const styles: Record<string, Record<string, string>> = {}

    for (const square of moves) {
      styles[square] = {
        backgroundImage: enemies.has(square) ? CAPTURE_RING : TARGET_DOT,
      }
    }
    for (const square of threats) {
      styles[square] = { ...styles[square], backgroundColor: THREAT_HIGHLIGHT }
    }
    styles[championSquare] = {
      ...styles[championSquare],
      backgroundColor: threats.length > 0 ? THREAT_HIGHLIGHT : CHAMPION_HIGHLIGHT,
    }
    return styles
  }, [moves, threats, enemies, championSquare])

  return (
    <div ref={containerRef} className="aspect-square w-full rounded-md shadow-card">
      {width ? (
        <Chessboard
          position={position}
          boardWidth={width}
          arePiecesDraggable={false}
          onSquareClick={(square) => {
            if (interactive) onMove(square)
          }}
          customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
          customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
          customSquareStyles={squareStyles}
          customBoardStyle={{ borderRadius: '0' }}
          animationDuration={120}
          id="hunt-board"
        />
      ) : null}
    </div>
  )
}
