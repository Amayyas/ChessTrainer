import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'

/**
 * The footer is the only place the legal notice and the AGPL source offer are
 * reachable from, so "it is on every page" is the claim worth testing — it used
 * to be on the landing alone, with the other routes carrying a bare pair of
 * links and no source link at all.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Footer', () => {
  it.each([ROUTES.home, ROUTES.dashboard, ROUTES.battle, ROUTES.puzzle, ROUTES.profile])(
    'carries the legal notice and the source offer at %s',
    async (path) => {
      renderAt(path)
      // The routed page arrives lazily; the footer is in the layout and is
      // there from the first paint, but wait so the assertion is not racing it.
      await screen.findByRole('heading', { level: 1 })

      const footer = screen.getByRole('contentinfo')
      expect(within(footer).getByRole('link', { name: 'Mentions légales' })).toHaveAttribute(
        'href',
        ROUTES.legal,
      )
      expect(within(footer).getByRole('link', { name: 'Confidentialité' })).toHaveAttribute(
        'href',
        ROUTES.privacy,
      )
      expect(within(footer).getByRole('link', { name: /Code source/ })).toHaveAttribute(
        'href',
        brand.sourceUrl,
      )
    },
  )

  it('sits outside <main>, so it is a contentinfo landmark', async () => {
    // Asserted on the DOM rather than through getByRole: a <footer> nested in
    // <main> is a generic element per the HTML-AAM and would vanish from a
    // screen reader's landmark list, but jsdom resolves the role by tag name
    // alone and reports contentinfo either way. The nesting is the real thing
    // to pin, so pin the nesting.
    renderAt(ROUTES.home)
    await screen.findByRole('heading', { level: 1 })

    const footer = screen.getByRole('contentinfo')
    expect(footer.tagName).toBe('FOOTER')
    expect(footer.closest('main')).toBeNull()
  })

  it('renders exactly once — the landing used to carry a second copy', async () => {
    renderAt(ROUTES.home)
    await screen.findByRole('heading', { level: 1 })
    expect(document.querySelectorAll('footer')).toHaveLength(1)
  })
})
