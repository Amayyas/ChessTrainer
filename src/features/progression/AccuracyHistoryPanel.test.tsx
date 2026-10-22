import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AccuracyHistoryPanel from '@/features/progression/AccuracyHistoryPanel'
import type { AccuracyEntry } from '@/features/progression/accuracyHistory'

function entry(accuracy: number): AccuracyEntry {
  return { playedAt: '2026-08-01T12:00:00.000Z', accuracy, level: 'Intermédiaire', outcome: 'win' }
}

describe('AccuracyHistoryPanel', () => {
  it('writes a falling trend with a true minus', () => {
    // The trend printed its number as JavaScript does, so a fall read "-25
    // pts" with a hyphen, where every other figure on the site sets U+2212.
    const falling = [
      ...Array<AccuracyEntry>(5).fill(entry(50)),
      ...Array<AccuracyEntry>(5).fill(entry(75)),
    ]
    render(<AccuracyHistoryPanel entries={falling} />)
    expect(screen.getByText(/pts sur vos 5 dernières/)).toHaveTextContent(
      '−25 pts sur vos 5 dernières',
    )
  })

  it('writes a rising trend with a plus', () => {
    const rising = [
      ...Array<AccuracyEntry>(5).fill(entry(80)),
      ...Array<AccuracyEntry>(5).fill(entry(60)),
    ]
    render(<AccuracyHistoryPanel entries={rising} />)
    expect(screen.getByText(/pts sur vos 5 dernières/)).toHaveTextContent(
      '+20 pts sur vos 5 dernières',
    )
  })
})
