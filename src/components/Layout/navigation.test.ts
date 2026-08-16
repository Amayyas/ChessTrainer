import { describe, expect, it } from 'vitest'
import { BOTTOM_BAR_ITEMS, NAV_ITEMS } from '@/components/Layout/navigation'
import { ROUTES } from '@/routes'

describe('navigation', () => {
  it('exposes one entry per navigable route', () => {
    // Reached from a guard, a link or the footer, never from the menu: the auth
    // screens and the two legal documents.
    const offMenu: string[] = [ROUTES.login, ROUTES.register, ROUTES.legal, ROUTES.privacy]
    const navigable = Object.values(ROUTES).filter((route) => !offMenu.includes(route))
    expect(NAV_ITEMS.map((item) => item.path).sort()).toEqual(navigable.sort())
  })

  it('contains no duplicate route', () => {
    const paths = NAV_ITEMS.map((item) => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('only exposes the 4 modes and the profile in the bottom bar', () => {
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
