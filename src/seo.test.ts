import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/routes'
import { INDEXABLE_ROUTES, PAGE_META, withRouteHead } from '@/seo'

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
    expect(INDEXABLE_ROUTES).toContain(ROUTES.coach)
  })

  it('leaves out the leaderboard, which requires an account', () => {
    // RequireAuth redirects a crawler to the sign-in screen, so listing it
    // would advertise a page no search engine can read.
    expect(INDEXABLE_ROUTES).not.toContain(ROUTES.leaderboard)
  })

  it('leaves out everything behind an account or an email link', () => {
    // These have nothing to offer a search result, and advertising the recovery
    // screens in a sitemap invites crawlers to spend links that work once. The
    // dashboard is a signed-in view reached from the menu; '/' is the public
    // page a visitor and a crawler actually land on.
    for (const path of [
      ROUTES.dashboard,
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

describe('withRouteHead', () => {
  // The real template with the domain substituted the way vite.config.ts does,
  // so a change to index.html that moves an anchor fails here, not in the build.
  const SITE = 'https://chesstrainer.test'
  const template = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf-8')
    .split('__SITE_URL__')
    .join(SITE)

  const head = (html: string) => ({
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1],
    ogUrl: /<meta property="og:url" content="([^"]*)"/.exec(html)?.[1],
    canonicals: [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]),
  })

  it('names every indexable page and claims its address before any JS runs', () => {
    // The shell a crawler fetched at /coach carried the home page's title and
    // og:url and no canonical, so every deep route read as a copy of '/'.
    for (const route of INDEXABLE_ROUTES) {
      const html = withRouteHead(template, route, `${SITE}/`)
      const escaped = PAGE_META[route].title.replace(/&/g, '&amp;')
      expect(head(html)).toEqual({
        title: escaped,
        ogUrl: `${SITE}${route}`,
        canonicals: [`${SITE}${route}`],
      })
    }
  })

  it('writes no canonical and leaves og:url alone without a domain', () => {
    const bare = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf-8')
      .split('__SITE_URL__')
      .join('')
    const html = withRouteHead(bare, ROUTES.battle, '')
    expect(head(html)).toEqual({
      title: PAGE_META[ROUTES.battle].title,
      ogUrl: '/',
      canonicals: [],
    })
  })

  it('refuses a template that already carries a canonical', () => {
    const once = withRouteHead(template, ROUTES.coach, SITE)
    expect(() => withRouteHead(once, ROUTES.coach, SITE)).toThrow(/already carries a canonical/)
  })

  it('refuses a template whose anchors moved', () => {
    const untitled = template.replace(/<title>[^<]*<\/title>/, '')
    expect(() => withRouteHead(untitled, ROUTES.coach, SITE)).toThrow(/lost its <title>/)
  })
})
