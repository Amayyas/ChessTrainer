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
    [ROUTES.home, 'Tableau de bord'],
    [ROUTES.coach, /IA Coach/],
    [ROUTES.battle, /Affrontement/],
    [ROUTES.puzzle, /Mode Puzzle/],
    [ROUTES.hunt, /Chasse aux Pieces/],
    [ROUTES.leaderboard, /Classement mondial/],
    [ROUTES.profile, 'Profil'],
  ])('rend la page attendue sur %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('rend la page 404 sur une route inconnue', () => {
    renderAt('/route-inexistante')
    expect(screen.getByRole('heading', { level: 1, name: /Page introuvable/ })).toBeInTheDocument()
  })

  it('rend la navigation principale dans le layout', () => {
    renderAt(ROUTES.home)
    expect(screen.getAllByRole('navigation', { name: 'Navigation principale' })).toHaveLength(2)
  })
})
