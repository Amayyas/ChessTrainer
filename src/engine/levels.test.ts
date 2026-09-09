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

  it('gets stronger with every level, on a dial the engine acts on', () => {
    // `uciElo` is non-decreasing and `depth` strictly increasing, so every step
    // up is a real change in play — not a config value that never reaches the
    // engine. (The two floor levels share uciElo 1320 and are told apart by
    // depth alone; `Skill Level` would be ignored there, so it is not used.)
    for (let i = 1; i < ENGINE_LEVELS.length; i += 1) {
      const previous = ENGINE_LEVELS[i - 1]!
      const current = ENGINE_LEVELS[i]!
      expect(current.uciElo).toBeGreaterThanOrEqual(previous.uciElo)
      expect(current.depth).toBeGreaterThan(previous.depth)
    }
  })

  it('pins the first level at the engine floor with the shallowest search', () => {
    // Stockfish 18 has no strength below UCI_Elo 1320, so the weakest level
    // sits there and leans on the one lever left — the depth cap.
    const novice = ENGINE_LEVELS[0]!
    expect(novice.uciElo).toBe(1320)
    expect(novice.depth).toBe(Math.min(...ENGINE_LEVELS.map((level) => level.depth)))
    expect(novice.elo).toBeLessThan(ENGINE_LEVELS[1]!.elo)
  })

  it('describes every level in words as well as a number', () => {
    for (const level of ENGINE_LEVELS) {
      expect(level.description.length).toBeGreaterThan(20)
    }
  })

  it('keeps every Stockfish option inside its supported range', () => {
    for (const level of ENGINE_LEVELS) {
      // UCI_Elo 1320–3190; sending below the floor is an error, not a weaker bot.
      expect(level.uciElo).toBeGreaterThanOrEqual(1320)
      expect(level.uciElo).toBeLessThanOrEqual(3190)
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
