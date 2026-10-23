import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageHeader from '@/components/UI/PageHeader'

describe('PageHeader', () => {
  it('opens the page with its title as the heading, and its standfirst', () => {
    render(<PageHeader title="Coach" subtitle="Jouez les deux camps." />)
    expect(screen.getByRole('heading', { level: 1, name: 'Coach' })).toBeInTheDocument()
    expect(screen.getByText('Jouez les deux camps.')).toBeInTheDocument()
  })

  it('keeps a minimum height for its actions, whatever they hold', () => {
    // The pages set a status here that changes form: a spinner and a line of
    // text, then a tag. Sized by its content, the slot changed height with
    // each, and on a narrow screen the board under it moved on every engine
    // reply in Affrontement.
    render(<PageHeader title="Affrontement" actions={<span>Aux blancs de jouer</span>} />)
    const slot = screen.getByText('Aux blancs de jouer').parentElement
    expect(slot?.className.split(/\s+/)).toContainEqual(expect.stringMatching(/^min-h-/))
  })
})
