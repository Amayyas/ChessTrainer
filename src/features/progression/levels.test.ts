import { describe, expect, it } from 'vitest'
import {
  MAX_LEVEL,
  huntXp,
  levelFromXp,
  totalXpForLevel,
  xpForNextLevel,
} from '@/features/progression/levels'

describe('levelFromXp', () => {
  it('starts everyone at level 1', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, isMaxLevel: false })
  })

  it('levels up exactly on the threshold', () => {
    const needed = xpForNextLevel(1)
    expect(levelFromXp(needed - 1).level).toBe(1)
    expect(levelFromXp(needed).level).toBe(2)
    expect(levelFromXp(needed).xpIntoLevel).toBe(0)
  })

  it('agrees with totalXpForLevel at every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      expect(levelFromXp(totalXpForLevel(level)).level).toBe(level)
    }
  })

  it('never passes the level cap', () => {
    const capped = levelFromXp(totalXpForLevel(MAX_LEVEL) + 100_000)
    expect(capped.level).toBe(MAX_LEVEL)
    expect(capped.isMaxLevel).toBe(true)
    expect(capped.ratio).toBe(1)
  })

  it('reports progress inside the level as a ratio', () => {
    const cost = xpForNextLevel(1)
    const half = levelFromXp(Math.floor(cost / 2))
    expect(half.ratio).toBeGreaterThan(0.4)
    expect(half.ratio).toBeLessThan(0.6)
  })

  it('treats negative or fractional XP safely', () => {
    expect(levelFromXp(-50).level).toBe(1)
    expect(levelFromXp(10.7).xpIntoLevel).toBe(10)
  })

  it('makes each level cost more than the last', () => {
    for (let level = 2; level < MAX_LEVEL; level += 1) {
      expect(xpForNextLevel(level)).toBeGreaterThan(xpForNextLevel(level - 1))
    }
  })
})

describe('huntXp', () => {
  it('gives a point per hundred scored', () => {
    expect(huntXp(0)).toBe(0)
    expect(huntXp(95)).toBe(0)
    expect(huntXp(300)).toBe(3)
    expect(huntXp(4370)).toBe(43)
  })

  it('caps an exceptional round so it cannot dwarf the other modes', () => {
    expect(huntXp(999_999)).toBe(60)
  })

  it('never goes negative', () => {
    expect(huntXp(-40)).toBe(0)
  })
})
