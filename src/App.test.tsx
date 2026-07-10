import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { ROUTES } from '@/routes'

function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>,
  )
}

describe('routing', () => {
  it.each([
    [ROUTES.home, /Apprenez les échecs/],
    [ROUTES.coach, 'Coach'],
    [ROUTES.battle, /Affrontement/],
    [ROUTES.puzzle, /Mode Puzzle/],
    [ROUTES.hunt, /Chasse aux Pièces/],
    [ROUTES.leaderboard, /Classement mondial/],
    [ROUTES.profile, 'Profil'],
  ])('renders the expected page at %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('renders the 404 page on an unknown route', () => {
    renderAt('/route-inexistante')
    expect(screen.getByRole('heading', { level: 1, name: /Page introuvable/ })).toBeInTheDocument()
  })

  it('renders the main navigation inside the layout', () => {
    renderAt(ROUTES.home)
    expect(screen.getAllByRole('navigation', { name: 'Navigation principale' })).toHaveLength(2)
  })
})
