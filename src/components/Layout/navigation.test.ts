import { describe, expect, it } from 'vitest'
import { BOTTOM_BAR_ITEMS, NAV_ITEMS } from '@/components/Layout/navigation'
import { ROUTES } from '@/routes'

describe('navigation', () => {
  it('exposes one entry per SPA route', () => {
    const navPaths = NAV_ITEMS.map((item) => item.path).sort()
    const routePaths = Object.values(ROUTES).sort()
    expect(navPaths).toEqual(routePaths)
  })

  it('contains no duplicate route', () => {
    const paths = NAV_ITEMS.map((item) => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('only exposes the 4 modes and the profile in the bottom bar (spec section 4.3)', () => {
    expect(BOTTOM_BAR_ITEMS.map((item) => item.path)).toEqual([
      ROUTES.coach,
      ROUTES.battle,
      ROUTES.puzzle,
      ROUTES.hunt,
      ROUTES.profile,
    ])
  })

  it('gives every entry a label and a description (accessibility)', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.trim()).not.toBe('')
      expect(item.description.trim()).not.toBe('')
      expect(item.glyph.trim()).not.toBe('')
    }
  })
})
