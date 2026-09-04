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
    // The dashboard moved off '/'; signed out (no backend in tests) '/' is the
    // landing, and '/dashboard' serves the dashboard as its own lazy chunk.
    [ROUTES.dashboard, /Apprenez les échecs/],
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

  it('serves the landing, not the dashboard, at / when signed out', async () => {
    // The h1 alone does not tell them apart — both say "Apprenez les échecs".
    // The dashboard's level bar and mode picker are what distinguish it, and
    // they must not be on '/'.
    renderAt(ROUTES.home)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/XP au total/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choisissez un mode' })).not.toBeInTheDocument()
  })

  it('serves the dashboard, not the landing, at /dashboard', async () => {
    renderAt(ROUTES.dashboard)
    expect(await screen.findByText(/XP au total/)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Choisissez un mode' }),
    ).toBeInTheDocument()
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
