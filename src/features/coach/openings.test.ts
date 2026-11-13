import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { OPENING_LABELS } from '@/features/coach/openings.data'
import { readOpening } from '@/features/coach/openings'

/** The moves of a game played out from `fen`, as the coach hands them over. */
function play(sans: string, fen?: string) {
  const chess = new Chess(fen)
  for (const san of sans.split(' ').filter(Boolean)) chess.move(san)
  return chess.history({ verbose: true })
}

const NAJDORF = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'

describe('readOpening', () => {
  it('names a main line and reports it still in theory', () => {
    expect(readOpening(play(NAJDORF))).toEqual({
      opening: { eco: 'B90', name: 'Défense sicilienne, variante Najdorf' },
      exitPly: null,
    })
  })

  it('names a line by its French name, not a translation of the English', () => {
    const fried = readOpening(play('e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7'))
    expect(fried?.opening.name).toBe(
      'Partie italienne, défense des deux cavaliers, attaque Fegatello',
    )
  })

  it('gives a line with no French name of its own its nearest named ancestor', () => {
    // 6.h3 is the book's "Najdorf Variation, Adams Attack", which the French
    // table does not list: the Najdorf it belongs to is the name to show.
    const adams = readOpening(play(`${NAJDORF} h3`))
    expect(adams?.opening.name).toBe('Défense sicilienne, variante Najdorf')
    expect(adams?.exitPly).toBeNull()
  })

  it('recognises a transposition by the position reached', () => {
    const viaKnight = readOpening(play('Nf3 d5 d4'))
    const viaPawn = readOpening(play('d4 d5 Nf3'))
    expect(viaKnight?.opening).toEqual(viaPawn?.opening)
  })

  it('reports the move that left theory, and keeps the opening it left', () => {
    // 4.Kf1 has never been book in the Giuoco Piano.
    const moves = play('e4 e5 Nf3 Nc6 Bc4 Bc5 Kf1 Nf6')
    const reading = readOpening(moves)
    expect(reading?.exitPly).toBe(6)
    expect(moves[6]!.san).toBe('Kf1')
    expect(reading?.opening.name).toBe('Partie italienne, Giuoco Piano')
  })

  it('names every first move White can play', () => {
    for (const san of new Chess().moves()) {
      const reading = readOpening(play(san))
      expect(reading, san).not.toBeNull()
      expect(reading!.exitPly, san).toBeNull()
    }
  })

  it('has nothing to say before a move, or from a set-up position', () => {
    expect(readOpening([])).toBeNull()
    // Even a set-up position that is itself in the book: the coach numbers the
    // move that left theory from the game's first move, which a pasted FEN
    // does not have.
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    expect(readOpening(play('c5', afterE4))).toBeNull()
  })
})

describe('the opening book', () => {
  it('names every opening in French, under a well-formed ECO code', () => {
    for (const [eco, name] of OPENING_LABELS) {
      expect(eco).toMatch(/^[A-E]\d\d$/)
      expect(name).not.toMatch(/\b(Opening|Defense|Variation|Attack|Game|Accepted|Declined)\b/)
    }
  })
})
