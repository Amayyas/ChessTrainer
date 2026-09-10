import { describe, expect, it } from 'vitest'
import { practicePuzzle } from '@/features/puzzle/practiceSet'
import { difficultyOf } from '@/features/puzzle/types'
import type { Puzzle } from '@/features/puzzle/types'

const puzzle = (id: string, rating: number): Puzzle => ({
  id,
  rating,
  fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
  solution: ['a1'],
  theme: 't',
  sideToMove: 'w',
})

// debutant < 1200, intermediaire 1200-1800, avance > 1800.
const pool = [
  puzzle('easy-a', 900),
  puzzle('easy-b', 1000),
  puzzle('mid-a', 1400),
  puzzle('mid-b', 1500),
  puzzle('hard-a', 2000),
]

describe('practicePuzzle', () => {
  it('only returns a puzzle of the chosen difficulty', () => {
    for (let i = 0; i < 20; i += 1) {
      const picked = practicePuzzle('debutant', [], new Set(), pool)!
      expect(difficultyOf(picked.rating)).toBe('debutant')
    }
  })

  it('prefers an unseen puzzle while the band still has one', () => {
    for (let i = 0; i < 20; i += 1) {
      const picked = practicePuzzle('debutant', ['easy-a'], new Set(), pool)!
      expect(picked.id).toBe('easy-b')
    }
  })

  it('falls back to a seen puzzle once the band is all seen', () => {
    const picked = practicePuzzle('debutant', ['easy-a', 'easy-b'], new Set(), pool)!
    expect(['easy-a', 'easy-b']).toContain(picked.id)
  })

  it('never returns one already served this session', () => {
    for (let i = 0; i < 20; i += 1) {
      const picked = practicePuzzle('debutant', [], new Set(['easy-a']), pool)!
      expect(picked.id).toBe('easy-b')
    }
  })

  it('returns null when the whole band has been served', () => {
    expect(practicePuzzle('debutant', [], new Set(['easy-a', 'easy-b']), pool)).toBeNull()
    expect(practicePuzzle('avance', [], new Set(['hard-a']), pool)).toBeNull()
  })
})
