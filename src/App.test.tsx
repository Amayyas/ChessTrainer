import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { ROUTES } from '@/routes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('routing', () => {
  it.each([
    [ROUTES.home, /Apprenez les échecs/],
    [ROUTES.coach, 'Coach'],
    [ROUTES.battle, /Affrontement/],
    [ROUTES.puzzle, 'Puzzles'],
    [ROUTES.hunt, /Chasse aux Pièces/],
    // Tests run with no backend configured, so the guard explains the
    // leaderboard is unavailable rather than rendering it.
    [ROUTES.leaderboard, /Classement indisponible/],
    [ROUTES.profile, 'Profil'],
    // Most routes are lazily loaded, so the heading arrives after the chunk
    // resolves; findBy waits for it (the eager home route resolves at once).
  ])('renders the expected page at %s', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('renders the 404 page on an unknown route', async () => {
    renderAt('/route-inexistante')
    expect(
      await screen.findByRole('heading', { level: 1, name: /Page introuvable/ }),
    ).toBeInTheDocument()
  })

  it('renders the main navigation inside the layout', () => {
    renderAt(ROUTES.home)
    expect(screen.getAllByRole('navigation', { name: 'Navigation principale' })).toHaveLength(2)
  })
})
