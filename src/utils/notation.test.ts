import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MOVE_QUALITY } from '@/utils/evaluation'
import {
  FIGURINE_RANGES,
  FIGURINES,
  FRENCH_LETTERS,
  inFigurineFace,
  notationParts,
  type PieceLetter,
} from '@/utils/notation'

const LETTERS = Object.keys(FIGURINES) as PieceLetter[]

/** The code points the figurine face's unicode-range declares in src/index.css. */
function figurineRange(): Array<[number, number]> {
  const css = readFileSync(resolve('src/index.css'), 'utf8')
  const face = /@font-face\s*{[^}]*font-family:\s*'Figurines'[^}]*unicode-range:\s*([^;]+);/.exec(
    css,
  )
  if (!face) throw new Error('no unicode-range on the Figurines face')
  return face[1]!.split(',').map((range) => {
    const [from, to = from] = range.trim().replace(/^U\+/, '').split('-')
    return [Number.parseInt(from!, 16), Number.parseInt(to!, 16)]
  })
}

describe('notation', () => {
  it('draws every piece and has a French letter to read it by', () => {
    for (const letter of LETTERS) {
      expect(notationParts(`${letter}f3`), letter).toEqual([{ piece: letter }, { text: 'f3' }])
      expect(FRENCH_LETTERS[letter], letter).toMatch(/^[A-Z]$/)
    }
  })

  it('leaves pawn moves and castling as they are written', () => {
    for (const san of ['e4', 'exd5', 'O-O', 'O-O-O+']) {
      expect(notationParts(san), san).toEqual([{ text: san }])
    }
  })

  it('finds a piece inside the move, and the one a pawn promotes to', () => {
    expect(notationParts('Nbxd7+')).toEqual([{ piece: 'N' }, { text: 'bxd7+' }])
    expect(notationParts('e8=Q#')).toEqual([{ text: 'e8=' }, { piece: 'Q' }, { text: '#' }])
  })

  it('reads every piece with a letter of its own', () => {
    // Two pieces sharing a letter would read the same to a screen reader.
    expect(new Set(Object.values(FRENCH_LETTERS)).size).toBe(LETTERS.length)
    expect(new Set(Object.values(FIGURINES)).size).toBe(LETTERS.length)
  })

  it('knows the same characters the self-hosted face declares', () => {
    // The face's unicode-range is written in src/index.css, the ranges the
    // components test against are written here: the two must not drift.
    expect(figurineRange()).toEqual(FIGURINE_RANGES.map(([from, to]) => [from, to]))
  })

  it('sets every figurine from the self-hosted face', () => {
    // A figurine outside the face falls through to whatever symbol font the
    // system has, at its own size and weight.
    for (const [letter, glyph] of Object.entries(FIGURINES)) {
      expect(inFigurineFace(glyph), `${letter} ${glyph}`).toBe(true)
    }
  })

  it('draws a grade sign from the face only when the face has all of it', () => {
    // A sign half in the face and half out would be set in two fonts at once.
    for (const [quality, meta] of Object.entries(MOVE_QUALITY)) {
      const inFace = [...meta.symbol].map((char) => inFigurineFace(char))
      expect(new Set(inFace).size, `${quality} ${meta.symbol}`).toBe(1)
    }
    expect(inFigurineFace('★')).toBe(true)
    expect(inFigurineFace('?!')).toBe(false)
  })
})
