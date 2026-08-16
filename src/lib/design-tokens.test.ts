import { describe, expect, it } from 'vitest'
import { board, brand, danger, fonts, palette } from '@/lib/design-tokens'

/**
 * These values used to be written out inside the board components. Moving them
 * here must not change a single pixel, so the expectations below are the exact
 * strings those components carried — if a refactor shifts one, this fails
 * rather than the change reaching a player's screen.
 */
describe('design tokens', () => {
  it('keeps the four colours of the visual identity', () => {
    expect(palette.ebene.DEFAULT).toBe('#1A1A2E')
    expect(palette.or.DEFAULT).toBe('#C9A84C')
    expect(palette.ivoire.DEFAULT).toBe('#F5F0E8')
    expect(palette.ardoise).toBe('#4A4A5A')
  })

  it('derives the board colours exactly as the components did', () => {
    expect(board.lightSquare).toBe('#EDE6D8')
    expect(board.darkSquare).toBe('#4A4A5A')
    expect(board.lastMove).toBe('rgba(201, 168, 76, 0.42)')
    expect(board.selected).toBe('rgba(201, 168, 76, 0.55)')
    expect(board.check).toBe('rgba(220, 38, 38, 0.5)')
    expect(board.threat).toBe('rgba(220, 38, 38, 0.55)')
    expect(board.arrow).toBe('#C9A84C')
  })

  it('builds the square overlays as CSS gradients', () => {
    expect(board.legalTarget).toBe(
      'radial-gradient(circle, rgba(26, 26, 46, 0.3) 22%, transparent 26%)',
    )
    expect(board.legalCapture).toBe(
      'radial-gradient(circle, transparent 55%, rgba(26, 26, 46, 0.3) 56%, ' +
        'rgba(26, 26, 46, 0.3) 62%, transparent 63%)',
    )
  })

  it('keeps danger out of the identity palette', () => {
    // It means "wrong", not "brand", so a rebrand must not sweep it up.
    expect(danger).toBe('#DC2626')
    expect(Object.values(palette)).not.toContain(danger)
  })

  it('names the typefaces and the brand in one place', () => {
    expect(fonts.display[0]).toBe('"Playfair Display"')
    expect(fonts.sans[0]).toBe('Inter')
    expect(brand.name).toBe('ChessTrainer')
    expect(brand.mark).toBe('♞')
  })
})
