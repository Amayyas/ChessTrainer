import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseUciMove } from '@/engine/uci'
import type { Puzzle } from '@/features/puzzle/types'
import type { PieceSymbol, Square } from '@/utils/chess'

/** Points a flawless puzzle is worth. */
export const BASE_POINTS = 100
/** Deducted per hint revealed. */
export const HINT_COST = 10
/** Deducted per wrong move. */
export const ERROR_COST = 15

export type MoveFeedback = 'correct' | 'wrong' | null

export interface SolvedResult {
  errors: number
  hints: number
  elapsedMs: number
}

/** Score for one puzzle, never below zero. */
export function scorePuzzle(errors: number, hints: number): number {
  return Math.max(0, BASE_POINTS - hints * HINT_COST - errors * ERROR_COST)
}

/** Whether the move is legal from `fen` and delivers checkmate. */
export function deliversMate(fen: string, from: string, to: string, promotion?: string): boolean {
  const chess = new Chess(fen)
  try {
    chess.move({ from, to, promotion })
  } catch {
    // chess.js throws on an illegal move.
    return false
  }
  return chess.isCheckmate()
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
}

export interface PuzzleRunner {
  /** Position shown on the board. */
  fen: string
  /** Whose move it is in the puzzle. */
  solverColor: 'w' | 'b'
  feedback: MoveFeedback
  errors: number
  hintLevel: number
  hintMessages: string[]
  isSolved: boolean
  elapsedMs: number
  /** Attempts a solver move; returns true when it was accepted. */
  attempt: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  revealHint: () => void
  getLegalTargets: (square: Square) => Square[]
  isPromotion: (from: Square, to: Square) => boolean
  lastMove: { from: Square; to: Square } | null
}

interface RunnerState {
  ply: number
  /** The player's own last move, when it was an accepted alternative mate. */
  playedFinal: string | null
  /** The solver's most recent move, for the board highlight. */
  lastMove: { from: Square; to: Square } | null
  errors: number
  hintLevel: number
  feedback: MoveFeedback
  isSolved: boolean
  startedAt: number
}

const freshState = (): RunnerState => ({
  ply: 0,
  playedFinal: null,
  lastMove: null,
  errors: 0,
  hintLevel: 0,
  feedback: null,
  isSolved: false,
  startedAt: Date.now(),
})

/**
 * The single-puzzle engine shared by the daily series and free practice: replays
 * the board, validates each move against the stored line, plays the opponent's
 * scripted reply, tracks errors and hints, and calls `onSolved` once — the
 * caller decides what a solve means (XP, streak, the next puzzle).
 *
 * All per-puzzle state resets the moment `puzzle` changes identity, so the
 * caller only has to hand over a new puzzle to move on.
 */
export function usePuzzleRunner(
  puzzle: Puzzle | null,
  onSolved: (result: SolvedResult) => void,
  /** Bump to restart the current puzzle even though its id has not changed. */
  epoch = 0,
): PuzzleRunner {
  const [state, setState] = useState<RunnerState>(freshState)
  const [elapsedMs, setElapsedMs] = useState(0)

  // Reset synchronously when the puzzle (or the epoch) changes, so no frame ever
  // renders the previous puzzle's ply against the new board. React's "adjust
  // state while rendering" pattern: the set calls only touch this component's
  // own state, and React discards and re-runs the render that triggered them.
  const signature = `${puzzle?.id ?? ''}#${epoch}`
  const [shownSignature, setShownSignature] = useState(signature)
  if (signature !== shownSignature) {
    setShownSignature(signature)
    setState(freshState())
    setElapsedMs(0)
  }

  const { ply, playedFinal, errors, hintLevel, feedback, isSolved } = state

  // The board replaying the solution up to the current ply. Once solved with an
  // accepted alternative mate, the last move played is the player's own.
  const board = useMemo(() => {
    if (!puzzle) return null
    const line = puzzle.solution.slice(0, ply)
    if (playedFinal && ply === puzzle.solution.length) line[line.length - 1] = playedFinal
    const chess = new Chess(puzzle.fen)
    for (const uci of line) {
      const move = parseUciMove(uci)
      if (!move) break
      try {
        chess.move({ from: move.from, to: move.to, promotion: move.promotion })
      } catch {
        break
      }
    }
    return chess
  }, [puzzle, ply, playedFinal])

  const fen = board?.fen() ?? new Chess().fen()

  // Timer for the current puzzle.
  useEffect(() => {
    if (isSolved) return
    const id = setInterval(() => setElapsedMs(Date.now() - state.startedAt), 250)
    return () => clearInterval(id)
  }, [state.startedAt, isSolved])

  // Clear the green/red flash shortly after it is shown.
  useEffect(() => {
    if (!feedback) return
    const id = setTimeout(() => setState((s) => ({ ...s, feedback: null })), 600)
    return () => clearTimeout(id)
  }, [feedback])

  const attempt = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!puzzle || isSolved || !board) return false

      const expected = puzzle.solution[ply]
      const parsed = expected ? parseUciMove(expected) : null
      if (!parsed) return false

      const matches =
        parsed.from === from &&
        parsed.to === to &&
        (parsed.promotion === undefined || parsed.promotion === promotion)

      // A finishing checkmate often has a legal twin, so when the stored final
      // move mates, any move that also mates is accepted. Deliberate: the move
      // that teaches the puzzle is the first one (which the importer screens
      // strictly), the last is just the finish, and it is the convention of the
      // Lichess set these come from. The importer relies on this — it does not
      // screen a final ply that is itself a checkmate, whatever the theme.
      const isFinalPly = ply === puzzle.solution.length - 1
      const finalMoveMates =
        isFinalPly && deliversMate(board.fen(), parsed.from, parsed.to, parsed.promotion)
      const alsoMates = !matches && finalMoveMates && deliversMate(board.fen(), from, to, promotion)

      if (!matches && !alsoMates) {
        setState((s) => ({ ...s, errors: s.errors + 1, feedback: 'wrong' }))
        return false
      }

      // The solver's move, then the opponent's scripted reply.
      const nextPly = ply + 1
      const finished = nextPly >= puzzle.solution.length

      setState((s) => ({
        ...s,
        feedback: 'correct',
        lastMove: { from, to },
        ply: finished ? nextPly : nextPly + 1,
        playedFinal: alsoMates ? from + to + (promotion ?? '') : s.playedFinal,
        isSolved: finished || s.isSolved,
      }))

      if (finished) {
        onSolved({ errors, hints: hintLevel, elapsedMs: Date.now() - state.startedAt })
      }
      return true
    },
    [puzzle, isSolved, board, ply, errors, hintLevel, state.startedAt, onSolved],
  )

  const hintMessages = useMemo(() => {
    if (!puzzle || !board) return []
    const expected = puzzle.solution[ply]
    const parsed = expected ? parseUciMove(expected) : null
    if (!parsed) return []

    const piece = board.get(parsed.from as Square)
    const name = piece ? (PIECE_NAMES[piece.type] ?? 'pièce') : 'pièce'

    // Third level spells the move out in algebraic notation.
    let san: string | null = null
    try {
      const probe = new Chess(board.fen())
      san = probe.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion }).san
    } catch {
      san = null
    }

    return [
      `Cherchez un coup de votre ${name}.`,
      `La pièce à jouer est en ${parsed.from}.`,
      san ? `Le coup à jouer est ${san}.` : `Jouez ${parsed.from}–${parsed.to}.`,
    ]
  }, [puzzle, board, ply])

  const revealHint = useCallback(() => {
    setState((s) => (s.isSolved ? s : { ...s, hintLevel: Math.min(3, s.hintLevel + 1) }))
  }, [])

  const getLegalTargets = useCallback(
    (square: Square): Square[] => {
      if (!board) return []
      return Array.from(new Set(board.moves({ square, verbose: true }).map((move) => move.to)))
    },
    [board],
  )

  const isPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      if (!board) return false
      return board
        .moves({ square: from, verbose: true })
        .some((move) => move.to === to && Boolean(move.promotion))
    },
    [board],
  )

  return {
    fen,
    solverColor: puzzle?.sideToMove ?? 'w',
    feedback,
    errors,
    hintLevel,
    hintMessages,
    isSolved,
    elapsedMs,
    attempt,
    revealHint,
    getLegalTargets,
    isPromotion,
    lastMove: state.lastMove,
  }
}
