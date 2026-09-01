import { describe, expect, it } from 'vitest'
import {
  centipawnLoss,
  classifyMove,
  MOVE_QUALITY,
  MOVE_QUALITY_ORDER,
  moveAccuracy,
  SLOWER_MATE_CP,
  SLOWER_MATE_MAX_CP,
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
    // zero. The coach compares against the chosen move instead.
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

describe('centipawnLoss between two forced mates', () => {
  // MATE_CP flattens every mate to the same centipawn score, so the cp
  // difference here is zero however far apart the mates are. That is what
  // scored mate in ten exactly like mate in one.
  const whiteMate = (moves: number) => ({ cp: 10000, mate: moves })
  const blackMate = (moves: number) => ({ cp: -10000, mate: -moves })

  it('prices the delay when the mover takes longer to mate', () => {
    expect(centipawnLoss(whiteMate(1), whiteMate(3), 'w')).toBe(2 * SLOWER_MATE_CP)
    expect(centipawnLoss(blackMate(1), blackMate(3), 'b')).toBe(2 * SLOWER_MATE_CP)
  })

  it('charges nothing for mating sooner than the engine meant to', () => {
    expect(centipawnLoss(whiteMate(5), whiteMate(2), 'w')).toBe(0)
    expect(centipawnLoss(whiteMate(3), whiteMate(3), 'w')).toBe(0)
  })

  it('caps the delay inside the inaccuracy band, however slow the mate', () => {
    // A mate that still mates gave nothing away. The tier the player reads must
    // not accuse them of an error, so the ladder stops here whether the delay is
    // nine moves or ninety.
    const slow = centipawnLoss(whiteMate(1), whiteMate(20), 'w')
    expect(slow).toBe(SLOWER_MATE_MAX_CP)
    expect(classifyMove(slow)).toBe('inaccuracy')
    expect(classifyMove(centipawnLoss(whiteMate(1), whiteMate(90), 'w'))).toBe('inaccuracy')
  })

  it('walks the tiers down as the delay grows', () => {
    expect(classifyMove(centipawnLoss(whiteMate(1), whiteMate(2), 'w'))).toBe('veryGood')
    expect(classifyMove(centipawnLoss(whiteMate(1), whiteMate(3), 'w'))).toBe('good')
    expect(classifyMove(centipawnLoss(whiteMate(1), whiteMate(4), 'w'))).toBe('inaccuracy')
  })

  it('charges the mated side for hurrying its own defeat', () => {
    // Both are -MATE_CP, so this used to be a zero loss and an excellent move.
    expect(centipawnLoss(blackMate(8), blackMate(6), 'w')).toBe(2 * SLOWER_MATE_CP)
    expect(centipawnLoss(blackMate(8), blackMate(1), 'w')).toBe(SLOWER_MATE_MAX_CP)
    // Holding out longer is not a loss.
    expect(centipawnLoss(blackMate(2), blackMate(8), 'w')).toBe(0)
  })
})

describe('centipawnLoss when only one side of the comparison is a mate', () => {
  it('keeps the centipawn comparison, where the gap is a real one', () => {
    // A mate traded for a merely winning position is not a slow mate, it is a
    // mate thrown away — and the ±MATE_CP gap already says so.
    const thrown = centipawnLoss({ cp: 10000, mate: 2 }, { cp: 300, mate: null }, 'w')
    expect(thrown).toBeGreaterThan(200)
    expect(classifyMove(thrown)).toBe('blunder')
  })

  it('scores walking into a mate as a blunder', () => {
    const reversed = centipawnLoss({ cp: 10000, mate: 2 }, { cp: -10000, mate: -3 }, 'w')
    expect(classifyMove(reversed)).toBe('blunder')
  })

  it('charges nothing for finding a mate the engine had not', () => {
    expect(centipawnLoss({ cp: 300, mate: null }, { cp: 10000, mate: 2 }, 'w')).toBe(0)
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
