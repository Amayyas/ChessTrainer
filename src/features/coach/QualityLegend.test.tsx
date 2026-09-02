import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import QualityLegend from '@/features/coach/QualityLegend'
import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'

/**
 * The legend is the only place a player is told what the seven marks mean, and
 * it had no test at all. What matters is not the wording but that it stays tied
 * to the table it explains: a tier added to MOVE_QUALITY and forgotten here
 * would ship unexplained without anything failing.
 */
describe('QualityLegend', () => {
  it('explains every tier the table defines', () => {
    render(<QualityLegend />)

    for (const quality of MOVE_QUALITY_ORDER) {
      const meta = MOVE_QUALITY[quality]
      expect(screen.getByText(meta.symbol)).toBeInTheDocument()
      expect(screen.getByText(meta.label)).toBeInTheDocument()
    }
    // One row per tier, so an extra row cannot hide an unexplained one.
    expect(screen.getAllByRole('listitem')).toHaveLength(MOVE_QUALITY_ORDER.length)
  })

  it('lists them strongest first, in the order the table gives', () => {
    render(<QualityLegend />)

    const rendered = screen.getAllByRole('listitem').map((item) => item.textContent)
    const expected = MOVE_QUALITY_ORDER.map(
      (quality) => `${MOVE_QUALITY[quality].symbol}${MOVE_QUALITY[quality].label}`,
    )
    expect(rendered).toEqual(expected)
  })
})
