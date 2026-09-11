import { describe, expect, it } from 'vitest'
import { board, brand, danger, fonts, palette, semanticTheme, surface } from '@/lib/design-tokens'

/**
 * `H S% L%` back to `#RRGGBB`, so the table below can be checked against the
 * palette rather than against a second copy of itself.
 *
 * Writing the expected triples out by hand would restate the data instead of
 * deriving it: the test would then agree with any literal someone pasted in,
 * which is the failure mode the home page's "cinq niveaux" already demonstrated.
 */
function hslTripleToHex(triple: string): string {
  const [h, s, l] = triple.split(' ').map((part) => Number.parseFloat(part)) as [
    number,
    number,
    number,
  ]
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const match = lightness - chroma / 2

  const sextant = Math.floor(h / 60) % 6
  const rgb = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][sextant] as [number, number, number]

  return `#${rgb
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase(),
    )
    .join('')}`
}

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

  it('points every shadcn variable back at a colour of the palette', () => {
    // The bridge is only worth having if it cannot drift. Each variable is
    // resolved back to a hex and compared with the token it is meant to carry,
    // so a literal typed straight into semanticTheme fails here.
    const expected: Record<string, string> = {
      '--background': palette.ivoire.DEFAULT,
      '--foreground': palette.ebene.DEFAULT,
      '--card': surface,
      '--card-foreground': palette.ebene.DEFAULT,
      '--popover': surface,
      '--popover-foreground': palette.ebene.DEFAULT,
      '--primary': palette.or.DEFAULT,
      '--primary-foreground': palette.ebene.DEFAULT,
      '--secondary': palette.ebene.DEFAULT,
      '--secondary-foreground': palette.ivoire.DEFAULT,
      '--muted': palette.ivoire.dark,
      '--muted-foreground': palette.ardoise,
      '--accent': palette.ivoire.dark,
      '--accent-foreground': palette.ebene.DEFAULT,
      '--destructive': danger,
      '--destructive-foreground': surface,
      '--ring': palette.or.DEFAULT,
    }

    for (const [variable, hex] of Object.entries(expected)) {
      expect(hslTripleToHex(semanticTheme[variable as keyof typeof semanticTheme])).toBe(hex)
    }
  })

  it('carries every variable a shadcn component reads', () => {
    // A missing one does not throw: the class resolves to hsl() of nothing and
    // the element paints transparent, which reads as a styling mistake rather
    // than as a missing token.
    const required = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
    ]
    expect(Object.keys(semanticTheme).sort()).toEqual([...required].sort())
  })

  it('keeps the hairline between the two colours it blends', () => {
    // --border is the only value with no token of its own: it is ebony laid
    // over ivory. It must land between them rather than on either.
    const hairline = hslTripleToHex(semanticTheme['--border'])
    expect(hairline).not.toBe(palette.ebene.DEFAULT)
    expect(hairline).not.toBe(palette.ivoire.DEFAULT)
    expect(semanticTheme['--input']).toBe(semanticTheme['--border'])
  })

  it('names the typefaces and the brand in one place', () => {
    expect(fonts.display[0]).toBe('"Playfair Display"')
    expect(fonts.sans[0]).toBe('Inter')
    expect(brand.name).toBe('ChessTrainer')
    expect(brand.mark).toBe('♞')
  })
})
