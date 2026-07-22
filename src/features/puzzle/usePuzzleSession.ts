import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseUciMove } from '@/engine/uci'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  DAILY_COUNT,
  EMPTY_PROGRESS,
  dailyPuzzles,
  dayKey,
  recordSolved,
  type PuzzleProgress,
} from '@/features/puzzle/dailySet'
import type { Puzzle } from '@/features/puzzle/types'
import type { PieceSymbol, Square } from '@/utils/chess'

/** Points a flawless puzzle is worth. */
export const BASE_POINTS = 100
/** Deducted per hint revealed (spec section 2.3). */
export const HINT_COST = 10
/** Deducted per wrong move. */
export const ERROR_COST = 15

export type MoveFeedback = 'correct' | 'wrong' | null

export interface PuzzleScore {
  puzzleId: string
  points: number
  errors: number
  hints: number
  elapsedMs: number
}

/** Score for one puzzle, never below zero. */
export function scorePuzzle(errors: number, hints: number): number {
  return Math.max(0, BASE_POINTS - hints * HINT_COST - errors * ERROR_COST)
}

export interface UsePuzzleSession {
  puzzles: Puzzle[]
  index: number
  puzzle: Puzzle | null
  /** Position shown on the board. */
  fen: string
  /** Whose move it is in the puzzle. */
  solverColor: 'w' | 'b'
  feedback: MoveFeedback
  errors: number
  hintLevel: number
  hintMessages: string[]
  isSolved: boolean
  /** Every puzzle of the day is done. */
  isSessionOver: boolean
  scores: PuzzleScore[]
  totalPoints: number
  elapsedMs: number
  progress: PuzzleProgress
  /** Attempts a solver move; returns true when it was the expected one. */
  attempt: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  revealHint: () => void
  next: () => void
  restart: () => void
  getLegalTargets: (square: Square) => Square[]
  isPromotion: (from: Square, to: Square) => boolean
  lastMove: { from: Square; to: Square } | null
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
}

/**
 * Runs the daily puzzle series (spec section 2.3): validates each move against
 * the stored solution, plays the opponent's reply, tracks errors, hints and
 * score, and keeps the daily streak.
 */
export function usePuzzleSession(): UsePuzzleSession {
  // The day is locked when the session starts. Recomputing it per render would
  // swap the whole series out from under a puzzle in progress at midnight — the
  // elapsed-time timer re-renders constantly — leaving `index` and `ply`
  // pointing into a different puzzle.
  const [today] = useState(() => dayKey())
  const puzzles = useMemo(() => dailyPuzzles(today), [today])

  const [index, setIndex] = useState(0)
  const [ply, setPly] = useState(0)
  const [errors, setErrors] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [feedback, setFeedback] = useState<MoveFeedback>(null)
  const [isSolved, setIsSolved] = useState(false)
  const [scores, setScores] = useState<PuzzleScore[]>([])
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [progress, setProgress] = useLocalStorage<PuzzleProgress>(
    'chesstrainer.puzzle.progress',
    EMPTY_PROGRESS,
  )

  const puzzle = puzzles[index] ?? null

  // A board replaying the solution up to the current ply.
  const board = useMemo(() => {
    if (!puzzle) return null
    const chess = new Chess(puzzle.fen)
    for (const uci of puzzle.solution.slice(0, ply)) {
      const move = parseUciMove(uci)
      if (!move) break
      try {
        chess.move({ from: move.from, to: move.to, promotion: move.promotion })
      } catch {
        break
      }
    }
    return chess
  }, [puzzle, ply])

  const fen = board?.fen() ?? new Chess().fen()

  // Timer for the current puzzle.
  useEffect(() => {
    if (isSolved) return
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 250)
    return () => clearInterval(id)
  }, [startedAt, isSolved])

  // Clear the green/red flash shortly after it is shown.
  useEffect(() => {
    if (!feedback) return
    const id = setTimeout(() => setFeedback(null), 600)
    return () => clearTimeout(id)
  }, [feedback])

  const lastMoveRef = useRef<{ from: Square; to: Square } | null>(null)

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

      if (!matches) {
        setErrors((count) => count + 1)
        setFeedback('wrong')
        return false
      }

      lastMoveRef.current = { from, to }
      setFeedback('correct')

      // The solver's move, then the opponent's scripted reply.
      const nextPly = ply + 1
      const finished = nextPly >= puzzle.solution.length
      setPly(finished ? nextPly : nextPly + 1)

      if (finished) {
        setIsSolved(true)
        const points = scorePuzzle(errors, hintLevel)
        setScores((all) => [
          ...all,
          {
            puzzleId: puzzle.id,
            points,
            errors,
            hints: hintLevel,
            elapsedMs: Date.now() - startedAt,
          },
        ])
        setProgress((current) => recordSolved(current, today))
      }
      return true
    },
    [puzzle, isSolved, board, ply, errors, hintLevel, startedAt, setProgress, today],
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
    if (!isSolved) setHintLevel((level) => Math.min(3, level + 1))
  }, [isSolved])

  const next = useCallback(() => {
    setIndex((current) => current + 1)
    setPly(0)
    setErrors(0)
    setHintLevel(0)
    setIsSolved(false)
    setFeedback(null)
    setStartedAt(Date.now())
    setElapsedMs(0)
    lastMoveRef.current = null
  }, [])

  const restart = useCallback(() => {
    setIndex(0)
    setPly(0)
    setErrors(0)
    setHintLevel(0)
    setIsSolved(false)
    setFeedback(null)
    setScores([])
    setStartedAt(Date.now())
    setElapsedMs(0)
    lastMoveRef.current = null
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
    puzzles,
    index,
    puzzle,
    fen,
    solverColor: puzzle?.sideToMove ?? 'w',
    feedback,
    errors,
    hintLevel,
    hintMessages,
    isSolved,
    isSessionOver: index >= Math.min(DAILY_COUNT, puzzles.length),
    scores,
    totalPoints: scores.reduce((sum, score) => sum + score.points, 0),
    elapsedMs,
    progress,
    attempt,
    revealHint,
    next,
    restart,
    getLegalTargets,
    isPromotion,
    lastMove: lastMoveRef.current,
  }
}
