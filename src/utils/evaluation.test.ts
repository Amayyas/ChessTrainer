import { describe, expect, it } from 'vitest'
import {
  centipawnLoss,
  classifyMove,
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

describe('classifyMove', () => {
  it('applies the documented thresholds', () => {
    expect(classifyMove(0)).toBe('best')
    expect(classifyMove(10)).toBe('excellent')
    expect(classifyMove(25)).toBe('good')
    expect(classifyMove(60)).toBe('inaccuracy')
    expect(classifyMove(150)).toBe('mistake')
    expect(classifyMove(400)).toBe('blunder')
  })

  it('separates the top tier from a move that is merely close to it', () => {
    // The whole point of the tier: giving up nothing is the engine's own move,
    // and it should not read the same as one a centipawn short of it.
    expect(classifyMove(0)).toBe('best')
    expect(classifyMove(1)).toBe('excellent')
  })

  it('treats a missed mate as a blunder regardless of centipawn loss', () => {
    expect(classifyMove(5, true)).toBe('blunder')
    // Including one that gave up nothing on the board: the mate it let slip is
    // the loss, and it must not be promoted to the top tier.
    expect(classifyMove(0, true)).toBe('blunder')
  })

  it('never treats a negative loss as worse than the top tier', () => {
    // Two searches of the same position can disagree by a centipawn, which
    // would otherwise let a move score better than perfect.
    expect(classifyMove(-50)).toBe('best')
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
