import { useCallback, useEffect, useRef, useState } from 'react'
import { markSeen } from '@/features/puzzle/progress'
import { practicePuzzle } from '@/features/puzzle/practiceSet'
import type { Difficulty } from '@/features/puzzle/types'
import type { Puzzle } from '@/features/puzzle/types'
import {
  scorePuzzle,
  usePuzzleRunner,
  type PuzzleRunner,
  type SolvedResult,
} from '@/features/puzzle/usePuzzleRunner'
import { useProgressionStore } from '@/store/useProgressionStore'

const DEFAULT_DIFFICULTY: Difficulty = 'intermediaire'

export interface UsePracticeSession extends PuzzleRunner {
  puzzle: Puzzle | null
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
  /** Puzzles solved this session. */
  solved: number
  totalPoints: number
  /** Every puzzle of the chosen band has been served this session. */
  isBandExhausted: boolean
  next: () => void
}

/**
 * Free practice: an endless stream of puzzles at a chosen difficulty, drawn
 * unseen-first from the pool. A puzzle solved here for the first time ever feeds
 * XP and the solved-puzzle list; one solved again is just practice, and pays out
 * nothing. The daily streak belongs to the daily series alone and never moves.
 */
export function usePracticeSession(): UsePracticeSession {
  const recordPuzzle = useProgressionStore((state) => state.recordPuzzle)
  const setProgress = useProgressionStore((state) => state.setPuzzleProgress)
  // Snapshotted at mount, so the unseen-first ordering does not shift as the
  // session goes; the payout check below reads the live store instead.
  const [seenAtStart] = useState(() => useProgressionStore.getState().puzzleProgress.seenPuzzleIds)

  const [difficulty, setDifficultyState] = useState<Difficulty>(DEFAULT_DIFFICULTY)
  // Every puzzle shown this session, across all bands: switching difficulty back
  // and forth never re-serves one, so it cannot be farmed for points.
  const served = useRef<Set<string>>(new Set())
  const [epoch, setEpoch] = useState(0)

  const pick = useCallback(
    (band: Difficulty) => practicePuzzle(band, seenAtStart, served.current),
    [seenAtStart],
  )

  // Pure initializer: React may double-invoke it in development, and marking a
  // puzzle served here would burn the one it discards.
  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => pick(DEFAULT_DIFFICULTY))
  const [solved, setSolved] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)

  // Record the puzzle on the board as served once it is actually shown.
  useEffect(() => {
    if (puzzle) served.current.add(puzzle.id)
  }, [puzzle])

  const onSolved = useCallback(
    (result: SolvedResult) => {
      if (!puzzle) return
      const puzzleId = puzzle.id
      // Read the live store, not a mount snapshot: a sign-in can fold in a
      // puzzle solved on another device while this view stays open.
      const alreadySolved = useProgressionStore
        .getState()
        .puzzleProgress.seenPuzzleIds.includes(puzzleId)
      setProgress((current) => ({
        ...current,
        seenPuzzleIds: markSeen(current.seenPuzzleIds, puzzleId),
      }))
      // Practising a puzzle solved before pays out nothing. Nothing repeats
      // within a session, so a first-ever solve cannot double-count here.
      if (alreadySolved) return
      setSolved((count) => count + 1)
      setTotalPoints((total) => total + scorePuzzle(result.errors, result.hints))
      recordPuzzle({ flawless: result.errors === 0 && result.hints === 0, streak: 0 })
    },
    [puzzle, setProgress, recordPuzzle],
  )

  const runner = usePuzzleRunner(puzzle, onSolved, epoch)

  const next = useCallback(() => {
    setPuzzle(pick(difficulty))
  }, [difficulty, pick])

  const setDifficulty = useCallback(
    (band: Difficulty) => {
      if (band === difficulty) return
      setDifficultyState(band)
      setPuzzle(pick(band))
      setEpoch((current) => current + 1)
    },
    [difficulty, pick],
  )

  return {
    ...runner,
    puzzle,
    difficulty,
    setDifficulty,
    solved,
    totalPoints,
    isBandExhausted: puzzle === null,
    next,
  }
}
