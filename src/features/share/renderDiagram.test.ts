import { describe, expect, it } from 'vitest'
import { fallbackFaces, fonts } from '@/lib/design-tokens'
import { fontsToLoad } from '@/features/share/renderDiagram'

describe('fontsToLoad', () => {
  it('asks for the self-hosted faces, never the local fallbacks', () => {
    // A fallback face missing from the machine made the whole load reject,
    // and every share failed with "a network error occurred".
    const requested = fontsToLoad().map(([font]) => font)
    for (const face of fallbackFaces) {
      for (const font of requested) expect(font).not.toContain(face.family)
    }
    expect(requested.some((font) => font.includes(fonts.serif[0]!))).toBe(true)
    expect(requested.some((font) => font.includes(fonts.figurine[0]!))).toBe(true)
  })
})
