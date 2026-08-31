import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DocumentHead from '@/features/seo/DocumentHead'
import { ROUTES } from '@/routes'
import { NOT_FOUND_META, PAGE_META } from '@/seo'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DocumentHead />
    </MemoryRouter>,
  )
}

describe('DocumentHead', () => {
  it('names the page the visitor is on', () => {
    // One HTML file serves every address, so without this the whole site
    // presents the home page's title — in a search result and in the tab bar.
    renderAt(ROUTES.battle)
    expect(document.title).toBe(PAGE_META[ROUTES.battle].title)
  })

  it('changes the title when the route does', () => {
    const { unmount } = renderAt(ROUTES.puzzle)
    expect(document.title).toBe(PAGE_META[ROUTES.puzzle].title)
    unmount()
    renderAt(ROUTES.leaderboard)
    expect(document.title).toBe(PAGE_META[ROUTES.leaderboard].title)
  })

  it('writes no canonical when no domain is configured', () => {
    // The test environment pins VITE_SITE_URL empty, so this is a property of
    // the code rather than of whoever's .env happens to be on disk. A relative
    // canonical is not a valid one, and one left pointing at the home page would
    // tell a search engine every page is a duplicate of it.
    renderAt(ROUTES.coach)
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  })

  it('points the canonical at the current page once a domain is set', async () => {
    // The other half of the branch above, and it had no test at all: the module
    // reads the domain once at load, so covering it needs the environment
    // stubbed and the module re-imported rather than merely re-rendered.
    vi.stubEnv('VITE_SITE_URL', 'https://chesstrainer.test/')
    vi.resetModules()
    const { default: Reloaded } = await import('@/features/seo/DocumentHead')

    render(
      <MemoryRouter initialEntries={[ROUTES.battle]}>
        <Reloaded />
      </MemoryRouter>,
    )

    // The trailing slash on the configured domain is dropped, or the URL would
    // carry two.
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://chesstrainer.test/battle',
    )
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('marks a page the sitemap leaves out as noindex', () => {
    // Leaving it out of the sitemap only declines to invite crawlers. A page
    // found through a link or a referrer still needs to be told to stay out.
    renderAt(ROUTES.login)
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, follow',
    )
  })

  it('lifts the directive again on a public page', () => {
    const { unmount } = renderAt(ROUTES.login)
    expect(document.querySelector('meta[name="robots"]')).not.toBeNull()
    unmount()
    renderAt(ROUTES.coach)
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('names an address that matches no route', () => {
    // Otherwise a mistyped URL keeps the title of wherever the visitor came
    // from, and a direct visit wears the home page's.
    renderAt('/cette-page-nexiste-pas')
    expect(document.title).toBe(NOT_FOUND_META.title)
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, follow',
    )
  })
})
