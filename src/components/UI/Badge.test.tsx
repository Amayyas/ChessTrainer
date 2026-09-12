import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Badge from '@/components/UI/Badge'

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>Tactique</Badge>)
    expect(screen.getByText('Tactique')).toBeInTheDocument()
  })

  it('applies the gold variant classes', () => {
    render(<Badge variant="gold">Or</Badge>)
    // Gold uses a gold background with ebony text, never gold text on a light
    // surface, which would fail WCAG AA contrast. The class names are the
    // semantic ones since the move to shadcn; --primary is the gold and
    // --primary-foreground the ebony, which design-tokens.test.ts pins.
    expect(screen.getByText('Or')).toHaveClass('bg-primary', 'text-primary-foreground')
  })
})
