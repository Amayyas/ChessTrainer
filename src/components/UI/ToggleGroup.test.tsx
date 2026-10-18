import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'

function Filters() {
  return (
    <ToggleGroup type="single" defaultValue="all" aria-label="Pièce">
      <ToggleGroupItem value="all">Toutes</ToggleGroupItem>
      <ToggleGroupItem value="knight">Cavalier</ToggleGroupItem>
    </ToggleGroup>
  )
}

describe('ToggleGroup', () => {
  it('gives the whole row one tab stop and walks it with the arrows', async () => {
    render(<Filters />)
    const [all, knight] = screen.getAllByRole('radio')
    if (!all || !knight) throw new Error('expected two options')

    await userEvent.tab()
    expect(all).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(knight).toHaveFocus()
  })

  it('underlines the chosen word itself rather than drawing on the rule', () => {
    // The leaderboard's filters wrap at phone widths, and a border at the foot
    // of the chosen option hung in mid-air above the row's rule. An underline
    // stays under its word on whichever line the word lands.
    render(<Filters />)
    for (const option of screen.getAllByRole('radio')) {
      expect(option.className.split(/\s+/)).not.toContainEqual(expect.stringMatching(/border-b/))
    }
    expect(screen.getByRole('radio', { name: 'Toutes' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('radio', { name: 'Toutes' }).className).toContain(
      'data-[state=on]:underline',
    )
  })
})
