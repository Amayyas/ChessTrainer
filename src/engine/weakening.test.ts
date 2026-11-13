import { describe, expect, it } from 'vitest'
import { MATE_CP, candidateValue, pickCandidate, type Candidate } from '@/engine/weakening'

const cp = (move: string, scoreCp: number): Candidate => ({ move, scoreCp, scoreMate: null })
const mate = (move: string, scoreMate: number): Candidate => ({ move, scoreCp: null, scoreMate })

/** How often each move is drawn over `n` draws on an evenly spread `random`. */
function frequencies(candidates: Candidate[], temperatureCp: number, n = 10_000) {
  const counts = new Map<string, number>()
  for (let i = 0; i < n; i += 1) {
    const move = pickCandidate(candidates, temperatureCp, () => (i + 0.5) / n)!
    counts.set(move, (counts.get(move) ?? 0) + 1)
  }
  return (move: string) => (counts.get(move) ?? 0) / n
}

describe('candidateValue', () => {
  it('caps a forced mate at MATE_CP either way', () => {
    expect(candidateValue(mate('a', 3))).toBe(MATE_CP)
    expect(candidateValue(mate('a', -1))).toBe(-MATE_CP)
    expect(candidateValue(mate('a', 0))).toBe(-MATE_CP)
    expect(candidateValue(cp('a', 5000))).toBe(MATE_CP)
    expect(candidateValue(cp('a', -120))).toBe(-120)
  })
})

describe('pickCandidate', () => {
  it('returns null with nothing to draw from', () => {
    expect(pickCandidate([], 100)).toBeNull()
  })

  it('weights each move by exp(-loss / temperature)', () => {
    // 100cp behind at T=100 is e times less likely than the best move.
    const freq = frequencies([cp('best', 50), cp('worse', -50)], 100)
    expect(freq('best') / freq('worse')).toBeCloseTo(Math.E, 1)
  })

  it('draws more often from the weaker moves as the temperature rises', () => {
    const lines = [cp('best', 0), cp('drop', -300)]
    const strict = frequencies(lines, 100)('drop')
    const loose = frequencies(lines, 600)('drop')
    expect(strict).toBeLessThan(0.06)
    expect(loose).toBeGreaterThan(0.3)
  })

  it('sometimes misses a mate, since a mate is only worth MATE_CP', () => {
    const freq = frequencies([mate('mates', 2), cp('safe', 0)], 650)
    expect(freq('safe')).toBeGreaterThan(0.1)
    expect(freq('mates')).toBeGreaterThan(freq('safe'))
  })

  it('stays inside the list at the edges of random()', () => {
    const lines = [cp('a', 0), cp('b', -10)]
    expect(pickCandidate(lines, 100, () => 0)).toBe('a')
    expect(pickCandidate(lines, 100, () => 1)).toBe('b')
  })
})
