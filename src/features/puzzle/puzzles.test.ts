import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { PUZZLES } from '@/features/puzzle/puzzles'
import { difficultyOf, themeLabel } from '@/features/puzzle/types'

/**
 * The dataset is imported and re-screened by scripts/import-lichess-puzzles.mjs,
 * so it is validated here rather than trusted: a puzzle whose solution does not
 * replay is exactly the "solved but marked wrong" failure this mode must never
 * have.
 */
describe('PUZZLES dataset', () => {
  it('holds a real pool with unique ids', () => {
    // The importer fills ten rating buckets to 150 each; well under 1000 means a
    // bucket starved or the run broke.
    expect(PUZZLES.length).toBeGreaterThanOrEqual(1000)
    const ids = PUZZLES.map((puzzle) => puzzle.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(PUZZLES.map((puzzle) => [puzzle.id, puzzle] as const))(
    '%s has a legal, replayable solution',
    (_id, puzzle) => {
      const chess = new Chess(puzzle.fen)
      expect(chess.turn()).toBe(puzzle.sideToMove)
      expect(chess.isGameOver()).toBe(false)
      expect(puzzle.solution.length).toBeGreaterThan(0)
      // The solver plays first and last, so the line has an odd number of plies.
      expect(puzzle.solution.length % 2).toBe(1)
      // Mates run to mate-in-3 (5 plies); other lines stop at two solver moves.
      expect(puzzle.solution.length).toBeLessThanOrEqual(5)
      // Loose band around the importer's 700–2200 window — a tripwire, not a
      // restatement.
      expect(puzzle.rating).toBeGreaterThanOrEqual(600)
      expect(puzzle.rating).toBeLessThanOrEqual(2400)

      for (const uci of puzzle.solution) {
        const applied = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        })
        expect(applied).not.toBeNull()
      }
    },
  )

  it('gives every theme a French label of its own', () => {
    const generic = themeLabel('gain-materiel')
    for (const theme of new Set(PUZZLES.map((puzzle) => puzzle.theme))) {
      if (theme === 'gain-materiel') continue
      expect(themeLabel(theme)).not.toBe(generic)
    }
  })

  it.each(
    PUZZLES.filter((puzzle) => puzzle.theme.startsWith('mat-en-')).map((p) => [p.id, p] as const),
  )('%s really ends in checkmate', (_id, puzzle) => {
    const chess = new Chess(puzzle.fen)
    for (const uci of puzzle.solution) {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    }
    expect(chess.isCheckmate()).toBe(true)

    const announced = Number(puzzle.theme.replace('mat-en-', ''))
    expect(puzzle.solution.length).toBe(announced * 2 - 1)
  })

  it('covers every difficulty band', () => {
    const bands = new Set(PUZZLES.map((puzzle) => difficultyOf(puzzle.rating)))
    expect(bands).toContain('debutant')
    expect(bands).toContain('intermediaire')
    expect(bands).toContain('avance')
  })
})
