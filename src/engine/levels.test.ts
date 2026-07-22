import { describe, expect, it } from 'vitest'
import { ENGINE_LEVELS, getLevel, thinkingDelay } from '@/engine/levels'

describe('ENGINE_LEVELS', () => {
  it('offers the five levels of the specification', () => {
    expect(ENGINE_LEVELS).toHaveLength(5)
    expect(ENGINE_LEVELS.map((level) => level.elo)).toEqual([800, 1000, 1300, 1700, 2200])
    expect(ENGINE_LEVELS.map((level) => level.label)).toEqual([
      'Novice',
      'Débutant',
      'Intermédiaire',
      'Avancé',
      'Maître',
    ])
  })

  it('gets stronger with every level', () => {
    for (let i = 1; i < ENGINE_LEVELS.length; i += 1) {
      const previous = ENGINE_LEVELS[i - 1]!
      const current = ENGINE_LEVELS[i]!
      expect(current.skill).toBeGreaterThan(previous.skill)
      expect(current.depth).toBeGreaterThan(previous.depth)
      // A lower maximum error means fewer deliberate mistakes.
      expect(current.maxError).toBeLessThan(previous.maxError)
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
    expect(getLevel(5).elo).toBe(2200)
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
