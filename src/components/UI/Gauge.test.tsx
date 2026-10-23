import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Gauge from '@/components/UI/Gauge'

describe('Gauge', () => {
  it('reports how far along it is, as a percentage', () => {
    render(<Gauge value={0.426} label="Défi : 3 puzzles" />)

    const gauge = screen.getByRole('progressbar', { name: 'Défi : 3 puzzles' })
    expect(gauge).toHaveAttribute('aria-valuenow', '43')
    expect(gauge.firstElementChild).toHaveStyle({ width: '43%' })
  })

  it('never reads past either end', () => {
    // A challenge can be overshot — four puzzles on a target of three — and a
    // bar wider than its frame, or a value of 133, would say something false.
    const { unmount } = render(<Gauge value={4 / 3} label="Plus" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    unmount()

    render(<Gauge value={-0.2} label="Moins" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
