import { dayKey } from '@/features/puzzle/progress'
import type { WhiteEval } from '@/utils/evaluation'

/**
 * The player's own mistakes, turned into puzzles: the position before a move
 * the coach graded a mistake or a blunder, to be solved again until the
 * better move comes without thinking.
 *
 * Kept with the player's progress, so it follows the account. Plain data and
 * pure functions only: the progression store and its sync import this module
 * at app start, and it must not drag the engine or the puzzle pool in.
 */
export interface MistakePuzzle {
  /** The position's FEN without its move counters: one puzzle per position. */
  id: string
  /** The position before the mistake, with the side that made it to move. */
  fen: string
  /** The engine's move there, in UCI. */
  best: string
  /**
   * The evaluation after the engine's move, from White's side: what a move
   * offered as an answer is measured against.
   */
  bestEval: WhiteEval
  /** The move actually played, in English SAN. */
  played: string
  /** ISO timestamp of when the mistake was collected. */
  createdAt: string
  /** The day it is next due, as YYYY-MM-DD. */
  due: string
  /** How many reviews in a row it has been solved: picks the next interval. */
  streak: number
}

/**
 * Days until the next review, by how many times in a row it has been solved:
 * the next day, then three days, a week, three weeks, two months. A failure
 * starts it over. Past the last step it is learnt, and leaves the list.
 */
export const REVIEW_INTERVALS = [1, 3, 7, 21, 60] as const

/** How many mistakes are kept: the newest, when a player makes more than that. */
export const MISTAKES_CAP = 60

/** The largest loss, in centipawns, an answer may cost and still count: 'good' or better. */
export const ANSWER_MARGIN_CP = 30

/** A FEN without its move counters: the same position reached at another move is the same puzzle. */
export function positionId(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

/** `day` moved on by `days`, as YYYY-MM-DD in local time. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dayKey(date)
}

/** The mistakes due on `day` or earlier, the longest overdue first. */
export function duePuzzles(list: readonly MistakePuzzle[], day: string): MistakePuzzle[] {
  return list.filter((puzzle) => puzzle.due <= day).sort((a, b) => a.due.localeCompare(b.due))
}

/**
 * The list after a review of `id` on `day`: solved, it comes back after the
 * next interval, or leaves the list once the intervals are run through;
 * missed, it comes back the next day and starts over.
 */
export function reviewMistake(
  list: readonly MistakePuzzle[],
  id: string,
  solved: boolean,
  day: string,
): MistakePuzzle[] {
  return list.flatMap((puzzle) => {
    if (puzzle.id !== id) return [puzzle]
    if (!solved) return [{ ...puzzle, streak: 0, due: addDays(day, REVIEW_INTERVALS[0]) }]
    const streak = puzzle.streak + 1
    const interval = REVIEW_INTERVALS[streak]
    return interval === undefined ? [] : [{ ...puzzle, streak, due: addDays(day, interval) }]
  })
}

/**
 * The list with `fresh` mistakes added: a position already in it keeps its
 * schedule, and past MISTAKES_CAP the oldest collected go first.
 */
export function addMistakes(
  list: readonly MistakePuzzle[],
  fresh: readonly MistakePuzzle[],
): MistakePuzzle[] {
  const known = new Set(list.map((puzzle) => puzzle.id))
  const added = fresh.filter((puzzle, index) => {
    const first = fresh.findIndex((other) => other.id === puzzle.id) === index
    return first && !known.has(puzzle.id)
  })
  return [...list, ...added]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-MISTAKES_CAP)
}

/**
 * Two lists of the same player, reconciled on sign-in: every mistake either
 * side knows, once. Where both hold it, the one reviewed further along wins,
 * so a review made on one device is not undone by the other.
 */
export function mergeMistakes(
  local: readonly MistakePuzzle[],
  server: readonly MistakePuzzle[],
): MistakePuzzle[] {
  const byId = new Map<string, MistakePuzzle>()
  for (const puzzle of [...server, ...local]) {
    const other = byId.get(puzzle.id)
    if (!other || puzzle.due > other.due) byId.set(puzzle.id, puzzle)
  }
  return addMistakes([], [...byId.values()])
}
