import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EvalBar from '@/components/Board/EvalBar'
import { winningChances } from '@/utils/evaluation'

describe('EvalBar', () => {
  it('formats a White advantage in pawns', () => {
    render(<EvalBar evaluation={{ cp: 120, mate: null }} />)
    expect(screen.getByText('+1,2')).toBeInTheDocument()
  })

  it('formats a Black advantage with a true minus', () => {
    render(<EvalBar evaluation={{ cp: -40, mate: null }} />)
    expect(screen.getByText('\u22120,4')).toBeInTheDocument()
  })

  it('writes an equal position without a sign', () => {
    render(<EvalBar evaluation={{ cp: -3, mate: null }} />)
    expect(screen.getByText('0,0')).toBeInTheDocument()
  })

  it('formats a forced mate', () => {
    render(<EvalBar evaluation={{ cp: 10000, mate: 3 }} />)
    expect(screen.getByText('M3')).toBeInTheDocument()
  })

  it('names a mate that has landed rather than counting to it', () => {
    // The last position of a game won by mate is "mate 0". It used to read M0,
    // a mate in no moves, which is not a thing.
    render(<EvalBar evaluation={{ cp: 10000, mate: 0 }} />)
    expect(screen.getByText('#')).toBeInTheDocument()
    // "#" is read out as "number sign", so the spoken form differs on purpose.
    expect(screen.getByRole('img', { name: 'Évaluation échec et mat' })).toBeInTheDocument()
  })

  it('exposes the evaluation to assistive tech', () => {
    render(<EvalBar evaluation={{ cp: 50, mate: null }} />)
    expect(screen.getByRole('img', { name: 'Évaluation +0,5' })).toBeInTheDocument()
  })

  it("inks Black's share of the chances, half at an equal position", () => {
    const { rerender } = render(<EvalBar evaluation={{ cp: 0, mate: null }} />)
    const gauge = screen.getByRole('img')
    expect(gauge).toHaveStyle({ '--black': '50%' })

    // White well ahead: Black's share shrinks, read from the same curve the
    // grades use rather than from a fixed number.
    rerender(<EvalBar evaluation={{ cp: 400, mate: null }} />)
    const black = Number.parseInt(gauge.style.getPropertyValue('--black'), 10)
    expect(black).toBe(100 - Math.round(winningChances(400) * 100))
    expect(black).toBeLessThan(50)
  })

  it('renders a neutral bar when no evaluation is available', () => {
    render(<EvalBar evaluation={null} />)
    expect(screen.getByText('–')).toBeInTheDocument()
  })
})
