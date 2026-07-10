import { describe, expect, it } from 'vitest'
import { BOTTOM_BAR_ITEMS, NAV_ITEMS } from '@/components/Layout/navigation'
import { ROUTES } from '@/routes'

describe('navigation', () => {
  it('expose une entree par route de la SPA', () => {
    const navPaths = NAV_ITEMS.map((item) => item.path).sort()
    const routePaths = Object.values(ROUTES).sort()
    expect(navPaths).toEqual(routePaths)
  })

  it('ne contient aucune route en double', () => {
    const paths = NAV_ITEMS.map((item) => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("n'expose que les 4 modes et le profil dans la bottom bar (section 4.3)", () => {
    expect(BOTTOM_BAR_ITEMS.map((item) => item.path)).toEqual([
      ROUTES.coach,
      ROUTES.battle,
      ROUTES.puzzle,
      ROUTES.hunt,
      ROUTES.profile,
    ])
  })

  it('donne un libelle et une description a chaque entree (accessibilite)', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.trim()).not.toBe('')
      expect(item.description.trim()).not.toBe('')
      expect(item.glyph.trim()).not.toBe('')
    }
  })
})
