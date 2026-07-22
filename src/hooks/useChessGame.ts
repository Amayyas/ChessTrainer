import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import { useCallback, useMemo, useRef, useState } from 'react'
import { findKingSquare, getGameStatus, type GameStatus } from '@/utils/chess'

export interface LastMove {
  from: Square
  to: Square
}

export interface UseChessGame {
  fen: string
  turn: 'w' | 'b'
  /** Verbose move list from the start of the game. */
  history: Move[]
  /** Algebraic notation of every move played, e.g. ['e4', 'e5', 'Nf3']. */
  sanHistory: string[]
  lastMove: LastMove | null
  status: GameStatus
  /** King square to highlight when the side to move is in check, else null. */
  checkSquare: Square | null
  /** Plays a move. Returns the applied move, or null if it was illegal. */
  move: (from: Square, to: Square, promotion?: PieceSymbol) => Move | null
  /** Legal destination squares for the piece on `square`. */
  getLegalTargets: (square: Square) => Square[]
  /** Whether moving from → to would require choosing a promotion piece. */
  isPromotion: (from: Square, to: Square) => boolean
  /** Takes back the last move. */
  undo: () => void
  /** Resets to the start position, or to `fen` when provided and valid. */
  reset: (fen?: string) => void
  /** The game so far in PGN, for handing it to another mode. */
  pgn: string
  /** Replays a PGN into the game. Returns false if it could not be parsed. */
  loadPgn: (pgn: string) => boolean
}

/**
 * Core chess state (spec module M3). Wraps a single chess.js instance kept in a
 * ref, and mirrors it into React state through a version counter so every
 * mutation triggers exactly one re-render, even when a position repeats.
 */
export function useChessGame(initialFen?: string): UseChessGame {
  const gameRef = useRef<Chess>(new Chess(initialFen))
  const [version, setVersion] = useState(0)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const move = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): Move | null => {
      try {
        const applied = gameRef.current.move({ from, to, promotion })
        bump()
        return applied
      } catch {
        // chess.js throws on an illegal move; treat it as "not applied".
        return null
      }
    },
    [bump],
  )

  const getLegalTargets = useCallback((square: Square): Square[] => {
    const moves = gameRef.current.moves({ square, verbose: true })
    return Array.from(new Set(moves.map((m) => m.to)))
  }, [])

  const isPromotion = useCallback((from: Square, to: Square): boolean => {
    return gameRef.current
      .moves({ square: from, verbose: true })
      .some((m) => m.to === to && Boolean(m.promotion))
  }, [])

  const undo = useCallback(() => {
    const undone = gameRef.current.undo()
    if (undone) bump()
  }, [bump])

  const reset = useCallback(
    (fen?: string) => {
      try {
        gameRef.current = new Chess(fen)
        bump()
      } catch {
        // Invalid FEN: leave the current game untouched.
      }
    },
    [bump],
  )

  const loadPgn = useCallback(
    (pgn: string): boolean => {
      try {
        const next = new Chess()
        next.loadPgn(pgn)
        gameRef.current = next
        bump()
        return true
      } catch {
        return false
      }
    },
    [bump],
  )

  // Every derived value recomputes once per mutation (version is the only dep).
  return useMemo(() => {
    void version
    const game = gameRef.current
    const history = game.history({ verbose: true })
    const last = history.at(-1) ?? null
    const status = getGameStatus(game)
    const turn = game.turn()

    return {
      fen: game.fen(),
      turn,
      history,
      sanHistory: history.map((m) => m.san),
      lastMove: last ? { from: last.from, to: last.to } : null,
      status,
      checkSquare: status.isCheck ? findKingSquare(game, turn) : null,
      move,
      getLegalTargets,
      isPromotion,
      undo,
      reset,
      pgn: game.pgn(),
      loadPgn,
    }
  }, [version, move, getLegalTargets, isPromotion, undo, reset, loadPgn])
}
