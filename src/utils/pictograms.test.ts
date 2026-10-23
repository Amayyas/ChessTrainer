import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { MODES } from '@/features/home/modes'
import { BADGES } from '@/features/progression/badges'
import { AVATAR_GLYPHS } from '@/lib/supabase'
import { inFigurineFace } from '@/utils/notation'

/**
 * The interface carries no icon library: its pictograms are the figurines,
 * ★ and ✓, drawn from the one self-hosted face. A sign outside it — the
 * emoji the badges used to carry, a die, a menu glyph — is drawn by each
 * platform in its own style and colours, so every list of pictograms is held
 * to the face here.
 */
describe('pictograms', () => {
  const lists: Record<string, string[]> = {
    navigation: NAV_ITEMS.map((item) => item.glyph),
    modes: MODES.map((mode) => mode.glyph),
    badges: BADGES.map((badge) => badge.glyph),
    avatars: Object.values(AVATAR_GLYPHS),
  }

  it.each(Object.entries(lists))('draws every %s sign from the figurine face', (_, glyphs) => {
    for (const glyph of glyphs) expect(inFigurineFace(glyph), glyph).toBe(true)
  })

  it('tells the badges apart by their signs', () => {
    const glyphs = BADGES.map((badge) => badge.glyph)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })
})
