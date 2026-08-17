import { describe, expect, it } from 'vitest'
import {
  appendEntry,
  HISTORY_LIMIT,
  recentTrend,
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
