import { describe, expect, it } from 'vitest'
import {
  centipawnLoss,
  classifyMove,
  MOVE_QUALITY,
  MOVE_QUALITY_ORDER,
  moveAccuracy,
  toWhiteEval,
  winningChances,
} from '@/utils/evaluation'

describe('toWhiteEval', () => {
  it('keeps White-to-move scores as-is', () => {
    expect(toWhiteEval({ scoreCp: 120, scoreMate: null }, 'w')).toEqual({ cp: 120, mate: null })
  })

  it('flips Black-to-move scores to White perspective', () => {
    expect(toWhiteEval({ scoreCp: 120, scoreMate: null }, 'b')).toEqual({ cp: -120, mate: null })
  })

  it('maps a mate to a large capped centipawn value with a signed mate', () => {
    const whiteMate = toWhiteEval({ scoreCp: null, scoreMate: 3 }, 'w')
    expect(whiteMate.mate).toBe(3)
    expect(whiteMate.cp).toBeGreaterThan(9000)

    const blackMate = toWhiteEval({ scoreCp: null, scoreMate: 2 }, 'b')
    expect(blackMate.mate).toBe(-2)
    expect(blackMate.cp).toBeLessThan(-9000)
  })
})

describe('winningChances', () => {
  it('is 0.5 at an equal position', () => {
    expect(winningChances(0)).toBeCloseTo(0.5, 5)
  })

  it('rises with White advantage and falls with Black advantage', () => {
    expect(winningChances(300)).toBeGreaterThan(0.6)
    expect(winningChances(-300)).toBeLessThan(0.4)
  })
})

describe('MOVE_QUALITY_ORDER', () => {
  it('covers every tier exactly once', () => {
    // The legend renders from this list, so a tier added to MOVE_QUALITY and
    // forgotten here would ship with no explanation and nothing would complain.
    expect([...MOVE_QUALITY_ORDER].sort()).toEqual(Object.keys(MOVE_QUALITY).sort())
  })

  it('runs strongest to weakest', () => {
    expect(MOVE_QUALITY_ORDER[0]).toBe('best')
    expect(MOVE_QUALITY_ORDER.at(-1)).toBe('blunder')
  })
})

describe('classifyMove', () => {
  it('applies the documented thresholds', () => {
    expect(classifyMove(0)).toBe('excellent')
    expect(classifyMove(10)).toBe('excellent')
    expect(classifyMove(15)).toBe('veryGood')
    expect(classifyMove(25)).toBe('good')
    expect(classifyMove(60)).toBe('inaccuracy')
    expect(classifyMove(150)).toBe('mistake')
    expect(classifyMove(400)).toBe('blunder')
  })

  it('never awards the top tier from a loss alone', () => {
    // A zero loss does not identify the engine's move: losses are clamped at
    // zero, and every forced mate collapses to one score. The coach compares
    // against the chosen move instead.
    expect(classifyMove(0)).not.toBe('best')
    expect(classifyMove(-50)).not.toBe('best')
  })

  it('splits the approving band at its boundaries', () => {
    // Three tiers now share the 0–30 range, so the edges are where a
    // one-centipawn drift changes the mark a player sees.
    expect(classifyMove(20)).toBe('veryGood')
    expect(classifyMove(21)).toBe('good')
    expect(classifyMove(30)).toBe('good')
    expect(classifyMove(31)).toBe('inaccuracy')
  })

  it('treats a missed mate as a blunder regardless of centipawn loss', () => {
    expect(classifyMove(5, true)).toBe('blunder')
    // Including one that gave up nothing on the board: the mate it let slip is
    // the loss, and it must not be promoted to the top tier.
    expect(classifyMove(0, true)).toBe('blunder')
  })

  it('never treats a negative loss as worse than excellent', () => {
    // Two searches of one position can disagree by a centipawn, which would
    // otherwise let a move score better than perfect.
    expect(classifyMove(-50)).toBe('excellent')
  })
})

describe('centipawnLoss', () => {
  it('measures what White gave up', () => {
    // White was +200, is now +50 → lost 150.
    expect(centipawnLoss({ cp: 200, mate: null }, { cp: 50, mate: null }, 'w')).toBe(150)
  })

  it('measures what Black gave up', () => {
    // Black was -200 (good for Black), is now -50 → Black lost 150.
    expect(centipawnLoss({ cp: -200, mate: null }, { cp: -50, mate: null }, 'b')).toBe(150)
  })

  it('is zero when the position did not worsen for the mover', () => {
    expect(centipawnLoss({ cp: 50, mate: null }, { cp: 90, mate: null }, 'w')).toBe(0)
  })
})

describe('moveAccuracy', () => {
  it('is ~100 when winning chances are unchanged', () => {
    expect(moveAccuracy(0.6, 0.6)).toBeGreaterThan(99)
  })

  it('drops sharply after a big swing', () => {
    expect(moveAccuracy(0.8, 0.3)).toBeLessThan(30)
  })

  it('stays within [0, 100]', () => {
    expect(moveAccuracy(1, 0)).toBeGreaterThanOrEqual(0)
    expect(moveAccuracy(0.5, 0.5)).toBeLessThanOrEqual(100)
  })
})
