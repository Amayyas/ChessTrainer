import { describe, expect, it } from 'vitest'
import { ENGINE_LEVELS, getLevel, thinkingDelay } from '@/engine/levels'

describe('ENGINE_LEVELS', () => {
  it('offers five levels', () => {
    expect(ENGINE_LEVELS).toHaveLength(5)
    expect(ENGINE_LEVELS.map((level) => level.label)).toEqual([
      'Novice',
      'Débutant',
      'Intermédiaire',
      'Avancé',
      'Maître',
    ])
  })

  it('gets stronger with every level', () => {
    // Never weaker on any axis, and strictly stronger on at least one. Skill
    // cannot carry that alone: 0 is Stockfish's floor, so the two weakest
    // levels share it and are separated by search depth instead.
    for (let i = 1; i < ENGINE_LEVELS.length; i += 1) {
      const previous = ENGINE_LEVELS[i - 1]!
      const current = ENGINE_LEVELS[i]!
      expect(current.skill).toBeGreaterThanOrEqual(previous.skill)
      expect(current.depth).toBeGreaterThan(previous.depth)
      // A lower maximum error, and a higher probability, both mean fewer
      // deliberate mistakes.
      expect(current.maxError).toBeLessThan(previous.maxError)
      expect(current.errorProbability).toBeGreaterThan(previous.errorProbability)
    }
  })

  it('starts at a depth that cannot see a reply coming', () => {
    // The complaint this answers: the old first level searched two plies and
    // played well above a beginner. One ply cannot see the recapture, which is
    // what makes it hang pieces the way a novice does.
    expect(ENGINE_LEVELS[0]!.depth).toBe(1)
    expect(ENGINE_LEVELS[0]!.skill).toBe(0)
  })

  it('describes every level in words rather than a fabricated rating', () => {
    // There is no calibrated opponent to anchor an Elo figure against, so any
    // number here would be invented — as the previous ones were.
    for (const level of ENGINE_LEVELS) {
      expect(level.description.length).toBeGreaterThan(20)
      expect(level).not.toHaveProperty('elo')
    }
  })

  it('keeps every Stockfish option inside its supported range', () => {
    for (const level of ENGINE_LEVELS) {
      expect(level.skill).toBeGreaterThanOrEqual(0)
      expect(level.skill).toBeLessThanOrEqual(20)
      expect(level.maxError).toBeGreaterThanOrEqual(0)
      expect(level.maxError).toBeLessThanOrEqual(5000)
      expect(level.errorProbability).toBeGreaterThanOrEqual(1)
      expect(level.errorProbability).toBeLessThanOrEqual(1000)
    }
  })
})

describe('getLevel', () => {
  it('returns the requested level', () => {
    expect(getLevel(1).label).toBe('Novice')
    expect(getLevel(5).label).toBe('Maître')
  })
})

describe('thinkingDelay', () => {
  it('stays inside the level range', () => {
    const level = getLevel(3)
    for (let i = 0; i < 20; i += 1) {
      const delay = thinkingDelay(level)
      expect(delay).toBeGreaterThanOrEqual(level.minDelayMs)
      expect(delay).toBeLessThanOrEqual(level.maxDelayMs)
    }
  })
})
