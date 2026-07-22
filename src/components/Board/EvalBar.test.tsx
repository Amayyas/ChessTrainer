import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EvalBar from '@/components/Board/EvalBar'

describe('EvalBar', () => {
  it('formats a White advantage in pawns', () => {
    render(<EvalBar evaluation={{ cp: 120, mate: null }} />)
    expect(screen.getByText('+1.2')).toBeInTheDocument()
  })

  it('formats a Black advantage with a sign', () => {
    render(<EvalBar evaluation={{ cp: -40, mate: null }} />)
    expect(screen.getByText('-0.4')).toBeInTheDocument()
  })

  it('formats a forced mate', () => {
    render(<EvalBar evaluation={{ cp: 10000, mate: 3 }} />)
    expect(screen.getByText('M3')).toBeInTheDocument()
  })

  it('exposes the evaluation to assistive tech', () => {
    render(<EvalBar evaluation={{ cp: 50, mate: null }} />)
    expect(screen.getByRole('img', { name: /Évaluation \+0\.5/ })).toBeInTheDocument()
  })

  it('renders a neutral bar when no evaluation is available', () => {
    render(<EvalBar evaluation={null} />)
    expect(screen.getByText('–')).toBeInTheDocument()
  })
})
