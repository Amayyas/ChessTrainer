import { describe, expect, it } from 'vitest'
import { ENGINE_LEVELS, getLevel, thinkingDelay } from '@/engine/levels'

describe('ENGINE_LEVELS', () => {
  it('offers six levels', () => {
    expect(ENGINE_LEVELS).toHaveLength(6)
    expect(ENGINE_LEVELS.map((level) => level.label)).toEqual([
      'Novice',
      'Débutant',
      'Intermédiaire',
      'Avancé',
      'Maître',
      'Grand Maître',
    ])
  })

  it('rises in Elo without a chasm between any two levels', () => {
    // The defect this answers: the previous ladder's top two levels were about
    // 1500 Elo apart, hidden behind a 96% self-play score — a figure a 500
    // point gap produces just as readily.
    for (let i = 1; i < ENGINE_LEVELS.length; i += 1) {
      const gap = ENGINE_LEVELS[i]!.elo - ENGINE_LEVELS[i - 1]!.elo
      expect(gap).toBeGreaterThan(0)
      expect(gap).toBeLessThanOrEqual(700)
    }
  })

  it('gets stronger with every level', () => {
    // Never weaker on any axis, and strictly stronger on at least one. Skill
    // cannot carry that alone: 0 is Stockfish's floor, so the two weakest
    // levels share it and are separated by search depth instead.
    for (let i = 1; i < ENGINE_LEVELS.length; i += 1) {
      const previous = ENGINE_LEVELS[i - 1]!
      const current = ENGINE_LEVELS[i]!
      expect(current.skill).toBeGreaterThanOrEqual(previous.skill)
      expect(current.depth).toBeGreaterThanOrEqual(previous.depth)
      // Never weaker on both of the two main axes at once.
      expect(current.skill > previous.skill || current.depth > previous.depth).toBe(true)
      // A lower maximum error, and a higher probability, both mean fewer
      // deliberate mistakes.
      expect(current.maxError).toBeLessThan(previous.maxError)
      expect(current.errorProbability).toBeGreaterThan(previous.errorProbability)
    }
  })

  it('starts well below beginner strength', () => {
    // The complaint this answers: the original first level played well above a
    // beginner. This one measures around 550 Elo, chained from Débutant.
    const novice = ENGINE_LEVELS[0]!
    expect(novice.elo).toBeLessThan(700)
    expect(novice.skill).toBe(0)
    // And searches no deeper than anything else on the ladder, which is what
    // stops it seeing a recapture coming.
    expect(novice.depth).toBe(Math.min(...ENGINE_LEVELS.map((level) => level.depth)))
  })

  it('describes every level in words as well as a number', () => {
    for (const level of ENGINE_LEVELS) {
      expect(level.description.length).toBeGreaterThan(20)
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
    expect(getLevel(6).label).toBe('Grand Maître')
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
