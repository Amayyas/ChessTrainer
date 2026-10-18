import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  board,
  brand,
  danger,
  fallbackFaces,
  fallbackFontFaces,
  fonts,
  newsprint,
  newsreaderMetrics,
  palette,
} from '@/lib/design-tokens'

/** WCAG 2.x relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio between two colours, from 1 to 21. */
function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [
    number,
    number,
  ]
  return (lighter + 0.05) / (darker + 0.05)
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

  it('measures contrast the way WCAG does', () => {
    // The control for the test below: a formula that inflated every ratio would
    // pass it. Black on white is 21:1 by definition, and the one pair the faint
    // ink's comment rules out must measure under AA, as its comment says.
    expect(contrast('#000000', '#FFFFFF')).toBe(21)
    expect(contrast(newsprint.ink.faint, newsprint.paper.deep)).toBeLessThan(4.5)
  })

  it('sets every newsprint text pair at WCAG AA', () => {
    // The pairs the interface sets text in, each held to the 4.5:1 floor for
    // body text. Captions are small, so none of them earns the 3:1 allowance
    // for large text. A lighter ink or a brighter red fails here first.
    // Contrast is symmetric, so each pair also covers its inverse: the rubric
    // on paper is paper on the rubric too.
    const { paper, ink, rubric } = newsprint
    const pairs: Record<string, [text: string, ground: string]> = {
      'ink on paper': [ink.DEFAULT, paper.DEFAULT],
      'ink on bright paper': [ink.DEFAULT, paper.bright],
      'ink on deep paper': [ink.DEFAULT, paper.deep],
      'soft ink on paper': [ink.soft, paper.DEFAULT],
      'soft ink on bright paper': [ink.soft, paper.bright],
      'soft ink on deep paper': [ink.soft, paper.deep],
      'faint ink on paper': [ink.faint, paper.DEFAULT],
      'rubric on paper, and paper on rubric: a primary button under the pointer': [
        rubric,
        paper.DEFAULT,
      ],
      'rubric on bright paper, and bright paper on rubric: the alert tag': [rubric, paper.bright],
      'paper on ink, the primary button': [paper.DEFAULT, ink.DEFAULT],
    }

    for (const [pair, [text, ground]] of Object.entries(pairs)) {
      expect(contrast(text, ground), pair).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('names the family the self-hosted stylesheets declare', () => {
    // A family name that matches no @font-face does not throw: the text falls
    // back to Georgia and looks almost right, which is how a typo ships. So the
    // name is read back from the stylesheets src/lib/fonts.ts actually imports.
    const imported = [
      ...readFileSync(resolve('src/lib/fonts.ts'), 'utf8').matchAll(/^import '([^']+\.css)'/gm),
    ].map((match) => match[1]!)
    expect(imported.length).toBeGreaterThan(0)

    const declared = new Set(
      imported.flatMap((stylesheet) =>
        [
          ...readFileSync(resolve('node_modules', stylesheet), 'utf8').matchAll(
            /font-family:\s*'([^']+)'/g,
          ),
        ].map((match) => `"${match[1]}"`),
      ),
    )
    expect([...declared]).toEqual([fonts.serif[0]])
  })

  it('reshapes a regular and a bold face for every fallback family', () => {
    // A family with no face for a weight hands that weight to the next family
    // in the stack, or to a synthetic bold, which sets wider and brings the
    // reflow back for every heading. So each family covers 200 to 800, no gap.
    const families = new Map<string, Array<[number, number]>>()
    for (const face of fallbackFaces) {
      const [from, to] = face.weight.split(' ').map(Number) as [number, number]
      families.set(face.family, [...(families.get(face.family) ?? []), [from, to]])
    }
    for (const [family, ranges] of families) {
      const sorted = [...ranges].sort((a, b) => a[0] - b[0])
      expect(sorted[0]![0], family).toBe(200)
      expect(sorted.at(-1)![1], family).toBe(800)
      sorted.slice(1).forEach(([from], index) => expect(from, family).toBe(sorted[index]![1] + 1))
    }
    // And the stack asks for exactly these families, after the web font.
    expect(fonts.serif.slice(1, -1)).toEqual([...families.keys()].map((family) => `"${family}"`))
  })

  it("derives each fallback's overrides from its own scale", () => {
    // The overrides are Newsreader's ascent and descent divided by the face's
    // size-adjust, so scaling them back must give Newsreader's metrics again.
    const fraction = (value: string) => Number.parseFloat(value) / 100
    for (const { '@font-face': face } of fallbackFontFaces()) {
      const scale = fraction(face.sizeAdjust)
      expect(fraction(face.ascentOverride) * scale).toBeCloseTo(newsreaderMetrics.ascent, 4)
      expect(fraction(face.descentOverride) * scale).toBeCloseTo(newsreaderMetrics.descent, 4)
    }
  })

  it('keeps the name and the mark in one place', () => {
    expect(brand.name).toBe('ChessTrainer')
    expect(brand.mark).toBe('♞')
  })
})
