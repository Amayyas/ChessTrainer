import { describe, expect, it } from 'vitest'
import { ENGINE_LEVELS, UCI_ELO_FLOOR, getLevel, thinkingDelay } from '@/engine/levels'

const RATED = ENGINE_LEVELS.filter((level) => level.uciElo !== null)
const WEAKENED = ENGINE_LEVELS.filter((level) => level.weakening !== null)

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

  it('sets each level by exactly one of UCI_Elo and the weakening', () => {
    for (const level of ENGINE_LEVELS) {
      expect([level.uciElo, level.weakening].filter((knob) => knob !== null)).toHaveLength(1)
    }
  })

  it('puts every weakened level below every rated one', () => {
    // The weakening exists for what UCI_Elo cannot reach; a weakened level
    // above a rated one would be a second scale spliced into the ladder.
    expect(WEAKENED.length).toBeGreaterThan(0)
    expect(ENGINE_LEVELS.slice(0, WEAKENED.length)).toEqual(WEAKENED)
    expect(Math.max(...WEAKENED.map((level) => level.elo))).toBeLessThan(UCI_ELO_FLOOR)
  })

  it('moves a real engine parameter at every step', () => {
    // No step is a config value that never reaches the engine. Below the floor
    // the draw grows stricter (a lower temperature) from one level to the
    // next; above it, `uciElo` rises. Depth never falls. The play-test found
    // depth inert at the floor (levels.ts), so it is not counted as a step.
    for (let i = 1; i < ENGINE_LEVELS.length; i += 1) {
      const previous = ENGINE_LEVELS[i - 1]!
      const current = ENGINE_LEVELS[i]!
      expect(current.depth).toBeGreaterThanOrEqual(previous.depth)
      if (previous.weakening && current.weakening) {
        expect(current.weakening.temperatureCp).toBeLessThan(previous.weakening.temperatureCp)
        expect(current.weakening.candidates).toBeLessThanOrEqual(previous.weakening.candidates)
      } else if (previous.uciElo !== null && current.uciElo !== null) {
        expect(current.uciElo).toBeGreaterThan(previous.uciElo)
      }
    }
  })

  it('describes every level in words as well as a number', () => {
    for (const level of ENGINE_LEVELS) {
      expect(level.description.length).toBeGreaterThan(20)
    }
  })

  it('keeps every Stockfish option inside its supported range', () => {
    for (const level of RATED) {
      // UCI_Elo floor–3190; sending below the floor is an error, not a weaker bot.
      expect(level.uciElo).toBeGreaterThanOrEqual(UCI_ELO_FLOOR)
      expect(level.uciElo).toBeLessThanOrEqual(3190)
    }
    for (const level of WEAKENED) {
      // MultiPV 1 would leave nothing to draw from; Stockfish caps it at 256,
      // and every extra line is another search against the battle's deadline.
      expect(level.weakening!.candidates).toBeGreaterThan(1)
      expect(level.weakening!.candidates).toBeLessThanOrEqual(10)
      expect(level.weakening!.temperatureCp).toBeGreaterThan(0)
    }
    for (const level of ENGINE_LEVELS) {
      // Depth is capped low on purpose — a long search past the battle's
      // SEARCH_TIMEOUT_MS is abandoned and counts against the engine. 14 is the
      // coach's depth and a safe ceiling; the ladder itself stops at 12.
      expect(level.depth).toBeGreaterThan(0)
      expect(level.depth).toBeLessThanOrEqual(14)
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
