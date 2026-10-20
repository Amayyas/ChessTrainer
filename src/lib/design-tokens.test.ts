import { existsSync, readFileSync } from 'node:fs'
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
  typeScale,
} from '@/lib/design-tokens'
import { MODES } from '@/features/home/modes'
import tailwindConfig from '../../tailwind.config'

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

  it('keeps danger out of the newsprint palette', () => {
    // It means "wrong" on the board, not a colour of the page, so a change of
    // palette must not sweep it up.
    expect(danger).toBe('#DC2626')
    const colours = Object.values(newsprint).flatMap((value) =>
      typeof value === 'string' ? [value] : Object.values(value),
    )
    expect(colours).not.toContain(danger)
  })

  it('gives the browser the paper as its theme colour', () => {
    // The colour a phone paints its toolbar in. It was the previous identity's
    // ebony, a dark bar over a page of paper; it is read back from index.html
    // so it cannot drift from the palette again.
    const html = readFileSync(resolve('index.html'), 'utf8')
    const themeColor = /<meta name="theme-color" content="([^"]+)"/.exec(html)?.[1]
    expect(themeColor?.toUpperCase()).toBe(newsprint.paper.DEFAULT.toUpperCase())
  })

  it('draws the favicon in the paper and the ink', () => {
    // The tab's icon kept the previous identity, a gold knight on a rounded
    // ebony tile, after every page had moved to paper and ink.
    const svg = readFileSync(resolve('public/favicon.svg'), 'utf8')
    const fills = new Set(
      [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]!.toUpperCase()),
    )
    expect(fills).toEqual(
      new Set([newsprint.paper.DEFAULT.toUpperCase(), newsprint.ink.DEFAULT.toUpperCase()]),
    )
    expect(svg).not.toMatch(/\brx=/)
  })

  it('renders the social image at the size the page declares for it', () => {
    // scripts/render-social-image.mjs draws it; the og:image dimensions in
    // index.html have to describe the file that is there.
    const html = readFileSync(resolve('index.html'), 'utf8')
    const declared = ['width', 'height'].map((side) =>
      Number(new RegExp(`og:image:${side}" content="(\\d+)"`).exec(html)?.[1]),
    )
    // A PNG's header holds its width and height, as big-endian words, at 16.
    const png = readFileSync(resolve('public/og-image.png'))
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual(declared)
  })

  it('draws the social image from the words and colours the site holds', () => {
    // scripts/render-social-image.mjs writes what it read into the PNG, as a
    // tEXt chunk. A renamed mode or a new tagline would otherwise leave the old
    // picture behind with nothing failing.
    const png = readFileSync(resolve('public/og-image.png'))
    let source: unknown = null
    for (let at = 8; at < png.length;) {
      const length = png.readUInt32BE(at)
      if (png.toString('latin1', at + 4, at + 8) === 'tEXt') {
        const data = png.toString('latin1', at + 8, at + 8 + length)
        const split = data.indexOf('\0')
        if (data.slice(0, split) === 'Source') source = JSON.parse(data.slice(split + 1))
      }
      at += 12 + length
    }
    expect(source, 'redraw it: node scripts/render-social-image.mjs').toEqual({
      name: brand.name,
      tagline: brand.tagline,
      promise: brand.promise,
      modes: MODES.map((mode) => mode.title),
      paper: newsprint.paper.DEFAULT,
      ink: newsprint.ink.DEFAULT,
    })
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

  it('points the faces declared by hand at the families the stacks ask for', () => {
    // The figurines and the italic are declared in src/index.css rather than
    // by a package's stylesheet. A family renamed on one side, or a file moved,
    // fails nowhere else: the text quietly falls back, the figurines to
    // whatever symbol font the system has, the italic to a slanted roman.
    const css = readFileSync(resolve('src/index.css'), 'utf8')
    const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
      family: /font-family:\s*'([^']+)'/.exec(body!)?.[1],
      style: /font-style:\s*(\w+)/.exec(body!)?.[1] ?? 'normal',
      url: /src:\s*url\('([^']+)'\)/.exec(body!)?.[1],
    }))
    expect(faces.map(({ family, style }) => `"${family}" ${style}`).sort()).toEqual(
      [`${fonts.figurine[0]} normal`, `${fonts.serif[0]} italic`].sort(),
    )
    for (const { url } of faces) expect(existsSync(resolve('src', url!)), url).toBe(true)
  })

  it('reshapes a regular, a bold and an italic face for every fallback family', () => {
    // A family with no face for a weight or a style makes the browser take its
    // nearest face and fake the rest — a bold drawn over the regular, a roman
    // slanted for an italic — at widths nothing here measured, which brings the
    // reflow back. So each family covers 200 to 800 in roman, with no gap, and
    // in italic the weights below its bold, which are all the pages set in
    // italic.
    const families = new Map<string, Record<string, Array<[number, number]>>>()
    for (const face of fallbackFaces) {
      const [from, to] = face.weight.split(' ').map(Number) as [number, number]
      const styles = families.get(face.family) ?? {}
      styles[face.style] = [...(styles[face.style] ?? []), [from, to]]
      families.set(face.family, styles)
    }
    for (const [family, { normal = [], italic = [] }] of families) {
      const roman = [...normal].sort((a, b) => a[0] - b[0])
      expect(roman[0]?.[0], family).toBe(200)
      expect(roman.at(-1)?.[1], family).toBe(800)
      roman.slice(1).forEach(([from], index) => expect(from, family).toBe(roman[index]![1] + 1))
      const bold = roman.find(([from, to]) => from <= 700 && 700 <= to)!
      expect(italic, `${family} italic`).toEqual([[200, bold[0] - 1]])
    }
    // And the stack asks for exactly these families, after the web font.
    expect(fonts.serif.slice(1, -1)).toEqual([...families.keys()].map((family) => `"${family}"`))
  })

  it('declares each fallback face for its own style, so the italic cannot replace the roman', () => {
    // Faces of one family and style whose weights overlap compete for the same
    // text, and the later rule wins. An italic emitted without its style is a
    // normal face over the regular weights, and would set every regular word
    // in italic.
    const taken = new Map<string, Array<[number, number]>>()
    for (const { '@font-face': face } of fallbackFontFaces()) {
      const slot = `${face.fontFamily} ${face.fontStyle}`
      const [from, to] = face.fontWeight.split(' ').map(Number) as [number, number]
      for (const [otherFrom, otherTo] of taken.get(slot) ?? []) {
        expect(to < otherFrom || from > otherTo, `${slot} ${face.fontWeight}`).toBe(true)
      }
      taken.set(slot, [...(taken.get(slot) ?? []), [from, to]])
    }
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

  it('offers the type scale and no other size', () => {
    // Tailwind's own sizes fail nothing when used: the tabs and the toggles set
    // their text at its 16 and 14 px until the pages were measured. The scale
    // replaces them in the theme instead of joining them, so they are not there
    // to be taken.
    expect(tailwindConfig.theme.fontSize).toBe(typeScale)
    expect(tailwindConfig.theme.extend).not.toHaveProperty('fontSize')
  })

  it('keeps the name and the mark in one place', () => {
    expect(brand.name).toBe('ChessTrainer')
    expect(brand.mark).toBe('♞')
  })
})
