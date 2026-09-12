import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { ROUTES } from '@/routes'

/**
 * The bottom bar is the only chrome a phone gets: the sidebar is hidden at
 * every width below md, and there is no header. So whatever is not in this bar
 * and not behind its menu is reachable from nowhere on mobile — which is what
 * happened to the leaderboard while the bar's last column went to the profile.
 */
function renderApp() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.dashboard]}>
      <App />
    </MemoryRouter>,
  )
}

function bottomBar() {
  // Two navigations carry this label, the sidebar's and the bar's; the bar is
  // the one that is not an <aside> child.
  const bars = screen.getAllByRole('navigation', { name: 'Navigation principale' })
  const bar = bars.find((element) => element.closest('aside') === null)
  if (!bar) throw new Error('bottom bar not found')
  return bar
}

describe('BottomBar', () => {
  it('spends its last column on a menu button, not a route', async () => {
    renderApp()
    await screen.findByRole('heading', { level: 1 })

    const trigger = within(bottomBar()).getByRole('button', { name: /Plus/ })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('reaches the leaderboard, which no mobile screen could reach before', async () => {
    renderApp()
    await screen.findByRole('heading', { level: 1 })

    // Not in the bar itself: that is the whole point of the change.
    expect(within(bottomBar()).queryByRole('link', { name: /Classement/ })).not.toBeInTheDocument()

    await userEvent.click(within(bottomBar()).getByRole('button', { name: /Plus/ }))

    // The sheet arrives through a dynamic import, so it is awaited rather than
    // asserted straight away.
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('link', { name: /Classement/ })).toHaveAttribute(
      'href',
      ROUTES.leaderboard,
    )
    expect(within(sheet).getByRole('link', { name: /Profil/ })).toHaveAttribute(
      'href',
      ROUTES.profile,
    )
  })

  it('closes the sheet once a destination is chosen', async () => {
    renderApp()
    await screen.findByRole('heading', { level: 1 })

    await userEvent.click(within(bottomBar()).getByRole('button', { name: /Plus/ }))
    const sheet = await screen.findByRole('dialog')
    await userEvent.click(within(sheet).getByRole('link', { name: /Classement/ }))

    // Navigating without closing would leave the menu covering the page it
    // just went to.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
