import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ENGINE_LEVELS } from '@/engine/levels'
import HomePage from '@/features/home/HomePage'

describe('HomePage battle card', () => {
  it('quotes the ladder that actually ships', () => {
    // This card advertised "cinq niveaux, de 800 à 2200 Elo" for two releases
    // after the ladder had six levels and measured figures. Copy that restates
    // data drifts from it silently, so it is derived now — and this fails if
    // anyone writes the numbers back in by hand.
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const floor = ENGINE_LEVELS[0]!.elo
    const ceiling = ENGINE_LEVELS[ENGINE_LEVELS.length - 1]!.elo
    expect(
      screen.getByText(
        `Défiez l'IA sur ${ENGINE_LEVELS.length} niveaux, de ${floor} à ${ceiling} Elo.`,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(`${ENGINE_LEVELS.length} niveaux`)).toBeInTheDocument()
  })
})
