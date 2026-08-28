import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/routes'
import { INDEXABLE_ROUTES, PAGE_META } from '@/seo'

describe('PAGE_META', () => {
  it('covers every route', () => {
    // A route added without an entry here would serve the home page's title and
    // never reach the sitemap, and nothing else would notice.
    expect(Object.keys(PAGE_META).sort()).toEqual(Object.values(ROUTES).sort())
  })

  it('gives every page a distinct title', () => {
    const titles = Object.values(PAGE_META).map((meta) => meta.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

describe('INDEXABLE_ROUTES', () => {
  it('keeps the pages worth finding', () => {
    expect(INDEXABLE_ROUTES).toContain(ROUTES.home)
    expect(INDEXABLE_ROUTES).toContain(ROUTES.battle)
    expect(INDEXABLE_ROUTES).toContain(ROUTES.privacy)
  })

  it('leaves out everything behind an account or an email link', () => {
    // These have nothing to offer a search result, and advertising the recovery
    // screens in a sitemap invites crawlers to spend links that work once.
    for (const path of [
      ROUTES.profile,
      ROUTES.login,
      ROUTES.register,
      ROUTES.forgotPassword,
      ROUTES.resetPassword,
    ]) {
      expect(INDEXABLE_ROUTES).not.toContain(path)
    }
  })
})
