import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import LeaderboardPage from '@/features/leaderboard/LeaderboardPage'

/**
 * The filters were a div of buttons with aria-pressed. Announced correctly and
 * impossible to drive: five options meant five tab stops, and the arrow keys
 * did nothing at all. These pin the behaviour the Radix group brought, because
 * it is the entire reason for the change — nothing about the page looks
 * different.
 */
function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  )
}

const pieceFilter = () => screen.getByRole('radiogroup', { name: 'Filtrer par pièce' })

describe('LeaderboardPage filters', () => {
  it('is one tab stop for the whole group, not one per option', async () => {
    renderPage()
    const group = pieceFilter()
    const options = within(group).getAllByRole('radio')
    expect(options.length).toBeGreaterThan(1)

    // Asserted by tabbing rather than by reading tabindex: Radix decides the
    // roving tab stop as focus arrives, so before any interaction every option
    // reads -1 and the attribute says nothing about what Tab will do.
    await userEvent.tab()
    expect(group.contains(document.activeElement)).toBe(true)

    // The second Tab leaves. With the old control it landed on the next of the
    // five buttons, and a keyboard user crossed the whole filter to get past it.
    await userEvent.tab()
    expect(group.contains(document.activeElement)).toBe(false)
  })

  it('moves between options with the arrow keys', async () => {
    renderPage()
    const options = within(pieceFilter()).getAllByRole('radio')
    const [first, second] = options
    if (!first || !second) throw new Error('expected at least two options')

    await userEvent.tab()
    expect(first).toHaveFocus()

    // The arrow moves focus; it does not choose. Radix separates the two here,
    // so a keyboard user can walk the options and see them before committing
    // to one. Before this control existed, the arrow did nothing whatsoever.
    await userEvent.keyboard('{ArrowRight}')
    expect(second).toHaveFocus()
    expect(second).toHaveAttribute('aria-checked', 'false')

    await userEvent.keyboard('{Enter}')
    expect(second).toHaveAttribute('aria-checked', 'true')
    expect(first).toHaveAttribute('aria-checked', 'false')
  })

  it('will not let a filter be emptied', async () => {
    renderPage()
    const options = within(pieceFilter()).getAllByRole('radio')
    const [first] = options
    if (!first) throw new Error('expected an option')

    // Radix lets a single-value group deselect on a second press. A filter has
    // no empty state, so that press has to be a no-op.
    expect(first).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(first)
    expect(first).toHaveAttribute('aria-checked', 'true')
  })
})
