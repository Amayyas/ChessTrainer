import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseUciMove } from '@/engine/uci'
import { DAILY_COUNT, dailyPuzzles } from '@/features/puzzle/dailySet'
import { dayKey, markSeen, recordSolved, type PuzzleProgress } from '@/features/puzzle/progress'
import { PUZZLES } from '@/features/puzzle/puzzles'
import type { Puzzle } from '@/features/puzzle/types'
import type { PieceSymbol, Square } from '@/utils/chess'
import { useProgressionStore } from '@/store/useProgressionStore'

/** Points a flawless puzzle is worth. */
export const BASE_POINTS = 100
/** Deducted per hint revealed. */
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

/**
 * Runs the daily puzzle series: validates each move against
 * the stored solution, plays the opponent's reply, tracks errors, hints and
 * score, and keeps the daily streak.
 */
export function usePuzzleSession(): UsePuzzleSession {
  // The day is locked when the session starts. Recomputing it per render would
  // swap the whole series out from under a puzzle in progress at midnight — the
  // elapsed-time timer re-renders constantly — leaving `index` and `ply`
  // pointing into a different puzzle.
  const [today] = useState(() => dayKey())
  const setProgress = useProgressionStore((state) => state.setPuzzleProgress)
  // Both snapshotted at mount, like `today`: a day's series is fixed once
  // picked, so working through it — which grows the solved list — cannot
  // reshuffle it, and reopening the day resumes the same five.
  const [savedSeries] = useState(() => useProgressionStore.getState().puzzleProgress.dailySeries)
  const [seenAtStart] = useState(() => useProgressionStore.getState().puzzleProgress.seenPuzzleIds)

  const puzzles = useMemo<Puzzle[]>(() => {
    if (savedSeries?.day === today) {
      const byId = new Map(PUZZLES.map((puzzle) => [puzzle.id, puzzle]))
      const resolved = savedSeries.ids
        .map((id) => byId.get(id))
        .filter((p): p is Puzzle => Boolean(p))
      // Fall through to a fresh pick if the pool was regenerated under it.
      if (resolved.length === savedSeries.ids.length && resolved.length > 0) return resolved
    }
    return dailyPuzzles(today, seenAtStart)
  }, [today, savedSeries, seenAtStart])

  // Persist the day's picks the first time they are computed.
  useEffect(() => {
    if (savedSeries?.day !== today && puzzles.length > 0) {
      setProgress((current) => ({
        ...current,
        dailySeries: { day: today, ids: puzzles.map((puzzle) => puzzle.id) },
      }))
    }
  }, [today, savedSeries, puzzles, setProgress])

  const [index, setIndex] = useState(0)
  const [ply, setPly] = useState(0)
  // The player's own last move, when it was an accepted alternative mate and so
  // differs from the stored line — the board shows theirs, not the canonical one.
  const [playedFinal, setPlayedFinal] = useState<string | null>(null)
  const [errors, setErrors] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [feedback, setFeedback] = useState<MoveFeedback>(null)
  const [isSolved, setIsSolved] = useState(false)
  const [scores, setScores] = useState<PuzzleScore[]>([])
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  // In the progression store rather than its own localStorage key, so the
  // streak belongs to the player and not to the browser they used.
  const progress = useProgressionStore((state) => state.puzzleProgress)

  const puzzle = puzzles[index] ?? null

  // A board replaying the solution up to the current ply. Once solved with an
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
        setErrors((count) => count + 1)
        setFeedback('wrong')
        return false
      }

      lastMoveRef.current = { from, to }
      if (alsoMates) setPlayedFinal(from + to + (promotion ?? ''))
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
        setProgress((current) => ({
          ...recordSolved(current, today),
          seenPuzzleIds: markSeen(current.seenPuzzleIds, puzzle.id),
        }))
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
    setPlayedFinal(null)
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
    setPlayedFinal(null)
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
