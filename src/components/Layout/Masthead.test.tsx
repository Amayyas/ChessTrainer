import { render, screen, within } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from '@/App'
import Masthead from '@/components/Layout/Masthead'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { brand } from '@/lib/design-tokens'
import type { Profile } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

/**
 * The site's banner. A page's own <header> is a banner to jsdom too, which
 * does not apply the rule that one inside <main> is not; the masthead is the
 * one outside it.
 */
function masthead() {
  const banner = screen.getAllByRole('banner').find((element) => element.closest('main') === null)
  if (!banner) throw new Error('masthead not found')
  return banner
}

function sectionBar() {
  return within(masthead()).getByRole('navigation', { name: 'Navigation principale' })
}

describe('Masthead', () => {
  afterEach(() => {
    useAuthStore.setState({ isReady: false, session: null, profile: null })
  })

  it('names the paper, and takes the nameplate home', async () => {
    renderAppAt(ROUTES.coach)
    await screen.findByRole('heading', { level: 1 })

    expect(within(masthead()).getByRole('link', { name: brand.name })).toHaveAttribute(
      'href',
      ROUTES.home,
    )
  })

  it('lists every section, and marks the one being read', async () => {
    renderAppAt(ROUTES.coach)
    await screen.findByRole('heading', { level: 1 })

    const links = within(sectionBar()).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      NAV_ITEMS.map((item) => item.path),
    )
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAttribute('href', ROUTES.coach)
  })

  it('sets the full masthead on the landing and the compact one elsewhere', async () => {
    // The tagline line is the full masthead's alone.
    const { unmount } = renderAppAt(ROUTES.home)
    await screen.findByRole('heading', { level: 1 })
    expect(within(masthead()).getByText(/sans compte obligatoire/)).toBeVisible()
    unmount()

    renderAppAt(ROUTES.coach)
    await screen.findByRole('heading', { level: 1 })
    expect(within(masthead()).queryByText(/sans compte obligatoire/)).not.toBeInTheDocument()
  })

  it('offers signing in as a link to the sign-in page', () => {
    useAuthStore.setState({ isReady: true, session: null })
    render(
      <MemoryRouter>
        <Masthead variant="compact" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', ROUTES.login)
  })

  it('names the account once signed in', () => {
    useAuthStore.setState({
      isReady: true,
      session: { user: { id: 'u1' } } as unknown as Session,
      profile: { username: 'Morphy', avatar_piece: 'n' } as Profile,
    })
    render(
      <MemoryRouter>
        <Masthead variant="compact" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /Morphy/ })).toHaveAttribute('href', ROUTES.profile)
    expect(screen.queryByRole('link', { name: 'Se connecter' })).not.toBeInTheDocument()
  })

  it('says nothing about the account until the session has been read', () => {
    // Otherwise a signed-in player sees "Se connecter" flash on every load.
    useAuthStore.setState({ isReady: false, session: null })
    render(
      <MemoryRouter>
        <Masthead variant="compact" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Se connecter' })).not.toBeInTheDocument()
  })
})
