import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GameSummary from '@/features/coach/GameSummary'
import type { GameSummary as GameSummaryData } from '@/features/coach/useCoachAnalysis'
import { MOVE_QUALITY } from '@/utils/evaluation'

/**
 * The counts were prose: "imprécisions", "erreurs" and "gaffes" written by hand
 * beside numbers that come from the tier table. That is the shape of the bug
 * CLAUDE.md records under "Copy that restates data drifts from it" — the home
 * page advertised five levels for two releases after there were six.
 */
function summaryWith(overrides: Partial<GameSummaryData> = {}): GameSummaryData {
  return {
    accuracyWhite: 82,
    accuracyBlack: 61,
    isComplete: true,
    inaccuracies: 0,
    mistakes: 0,
    blunders: 0,
    bestMove: null,
    ...overrides,
  }
}

describe('GameSummary counts', () => {
  it('names each tier with the word the table holds', () => {
    render(
      <GameSummary
        summary={summaryWith({ inaccuracies: 3, mistakes: 2, blunders: 4 })}
        statusLabel="Échec et mat"
      />,
    )

    // Rebuilt from the same module the component reads, so renaming a tier
    // renames it here too and hand-written copy fails.
    expect(
      screen.getByText(`3 ${MOVE_QUALITY.inaccuracy.plural.toLowerCase()}`),
    ).toBeInTheDocument()
    expect(screen.getByText(`2 ${MOVE_QUALITY.mistake.plural.toLowerCase()}`)).toBeInTheDocument()
    expect(screen.getByText(`4 ${MOVE_QUALITY.blunder.plural.toLowerCase()}`)).toBeInTheDocument()
  })

  it('agrees in number, as French wants', () => {
    render(
      <GameSummary
        summary={summaryWith({ inaccuracies: 1, mistakes: 0, blunders: 2 })}
        statusLabel="Nulle"
      />,
    )

    // One and zero take the singular; the old copy said "1 imprécisions".
    expect(screen.getByText(`1 ${MOVE_QUALITY.inaccuracy.label.toLowerCase()}`)).toBeInTheDocument()
    expect(screen.getByText(`0 ${MOVE_QUALITY.mistake.label.toLowerCase()}`)).toBeInTheDocument()
    expect(screen.getByText(`2 ${MOVE_QUALITY.blunder.plural.toLowerCase()}`)).toBeInTheDocument()
  })

  it('shows an accuracy per colour, and a dash when there is none', () => {
    render(
      <GameSummary
        summary={summaryWith({ accuracyWhite: 91, accuracyBlack: null })}
        statusLabel="Partie en cours"
      />,
    )

    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('names the best move and whose it was', () => {
    render(
      <GameSummary
        summary={summaryWith({ bestMove: { san: 'Qh5', index: 4, color: 'b' } })}
        statusLabel="Abandon"
      />,
    )

    expect(screen.getByText(/Qh5 \(noirs\)/)).toBeInTheDocument()
  })
})
