import { describe, expect, it } from 'vitest'
import {
  appendEntry,
  HISTORY_LIMIT,
  mergeHistories,
  recentTrend,
  sortNewestFirst,
  type AccuracyEntry,
} from '@/features/progression/accuracyHistory'

function entry(accuracy: number, day = 1): AccuracyEntry {
  return {
    playedAt: `2026-08-${String(day).padStart(2, '0')}T12:00:00.000Z`,
    accuracy,
    level: 'Intermédiaire',
    outcome: 'win',
  }
}

describe('appendEntry', () => {
  it('puts the newest game first', () => {
    const history = appendEntry(appendEntry([], entry(60, 1)), entry(80, 2))
    expect(history.map((e) => e.accuracy)).toEqual([80, 60])
  })

  it('drops the oldest past the limit', () => {
    // The history travels inside a JSON column on every save, so an unbounded
    // list would make each write slower than the last, forever.
    let history: AccuracyEntry[] = []
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) history = appendEntry(history, entry(i % 101))
    expect(history).toHaveLength(HISTORY_LIMIT)
  })

  it('never mutates the history it was given', () => {
    const original = [entry(60)]
    appendEntry(original, entry(80))
    expect(original).toHaveLength(1)
  })
})

describe('recentTrend', () => {
  it('says nothing until there are two full windows', () => {
    // A trend drawn from one game and its predecessor is noise wearing the
    // clothes of a measurement.
    const nine = Array.from({ length: 9 }, () => entry(70))
    expect(recentTrend(nine)).toBeNull()
  })

  it('compares the last five games with the five before them', () => {
    // Newest first, so the improvement is at the front.
    const history = [...Array(5).fill(entry(80)), ...Array(5).fill(entry(60))]
    expect(recentTrend(history)).toEqual({ recent: 80, previous: 60, delta: 20 })
  })

  it('reports a decline as a negative delta', () => {
    const history = [...Array(5).fill(entry(50)), ...Array(5).fill(entry(75))]
    expect(recentTrend(history)?.delta).toBe(-25)
  })
})

describe('sortNewestFirst', () => {
  it('restores the order every reader here depends on', () => {
    // A row from an older write, a merge, or a tampered client carries no
    // ordering guarantee, and an out-of-order array would silently plot and
    // compare the wrong games.
    const shuffled = [entry(60, 2), entry(80, 5), entry(70, 3)]
    expect(sortNewestFirst(shuffled).map((e) => e.accuracy)).toEqual([80, 70, 60])
  })
})

describe('mergeHistories', () => {
  it('keeps an entry the server has not seen yet', () => {
    // The bug this covers: hydration replaced the log outright, so a game
    // reviewed while the pull was in flight was dropped — and the pull then
    // marked the server copy as synchronised, so it was never sent either.
    const local = [entry(90, 9)]
    const server = [entry(60, 2), entry(70, 3)]
    expect(mergeHistories(local, server).map((e) => e.accuracy)).toEqual([90, 70, 60])
  })

  it('counts the same game seen twice as one', () => {
    const shared = entry(75, 4)
    expect(mergeHistories([shared], [shared])).toHaveLength(1)
  })

  it('stays bounded and newest first', () => {
    // Distinct instants, or the deduplication would rightly collapse them and
    // the bound would never be reached.
    const at = (minute: number): AccuracyEntry => ({
      playedAt: new Date(Date.UTC(2026, 7, 1, 0, minute)).toISOString(),
      accuracy: 50,
      level: 'Novice',
      outcome: 'win',
    })
    const older = Array.from({ length: 80 }, (_, i) => at(i))
    const newer = Array.from({ length: 80 }, (_, i) => at(i + 80))

    const merged = mergeHistories(newer, older)
    expect(merged).toHaveLength(HISTORY_LIMIT)
    const times = merged.map((e) => Date.parse(e.playedAt))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    // The bound keeps the newest, not whichever happened to be first.
    expect(merged[0]!.playedAt).toBe(at(159).playedAt)
  })
})
