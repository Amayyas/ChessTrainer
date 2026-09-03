import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ENGINE_LEVELS } from '@/engine/levels'
import LandingPage from '@/features/home/LandingPage'
import { MODES } from '@/features/home/modes'
import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('quotes the ladder that actually ships', () => {
    // The home page advertised "cinq niveaux, de 800 a 2200 Elo" for two
    // releases after the ladder had six levels with measured figures, because
    // the numbers were prose. They are derived here, so this fails if anyone
    // writes them back in by hand.
    renderLanding()

    const floor = ENGINE_LEVELS[0]!.elo
    const ceiling = ENGINE_LEVELS[ENGINE_LEVELS.length - 1]!.elo

    // Match the figures in their sentence, not the whole paragraph: a copy edit
    // around them should not fail this, a wrong number should.
    expect(
      screen.getByText(
        new RegExp(`propose ${ENGINE_LEVELS.length} adversaires, de ${floor} .+ ${ceiling} Elo`),
      ),
    ).toBeInTheDocument()

    // And every level is listed with its own measured figure.
    for (const level of ENGINE_LEVELS) {
      expect(screen.getByText(level.label)).toBeInTheDocument()
      expect(screen.getByText(`${level.elo} Elo`)).toBeInTheDocument()
    }
  })

  it('shows every grading tier with its symbol', () => {
    // The coach section is the in-app legend's twin: same tiers, same marks,
    // same source. Every tier defined in MOVE_QUALITY must appear here, in the
    // MOVE_QUALITY_ORDER order — a tier added to one and forgotten in the other
    // fails this.
    renderLanding()

    const legend = screen.getByRole('list', { name: 'Barème de notation des coups' })
    const rows = within(legend).getAllByRole('listitem')
    expect(rows).toHaveLength(Object.keys(MOVE_QUALITY).length)

    rows.forEach((row, index) => {
      const meta = MOVE_QUALITY[MOVE_QUALITY_ORDER[index]!]
      expect(within(row).getByText(meta.symbol)).toBeInTheDocument()
      expect(within(row).getByText(meta.label)).toBeInTheDocument()
    })
  })

  it('offers a route into every mode', () => {
    // A mode dropped from the shared list would quietly vanish from the front
    // door.
    renderLanding()

    for (const mode of MODES) {
      const link = screen.getByRole('link', { name: new RegExp(mode.title) })
      expect(link).toHaveAttribute('href', mode.to)
    }
  })

  it('leads with the two calls to action', () => {
    renderLanding()

    expect(screen.getByRole('link', { name: 'Essayer le coach' })).toHaveAttribute('href', '/coach')
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register',
    )
  })
})
