import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SquaresToggle from '@/components/Board/SquaresToggle'
import { useBoardStore } from '@/store/useBoardStore'

beforeEach(() => {
  localStorage.clear()
  useBoardStore.setState({ squares: 'hatched' })
})

describe('SquaresToggle', () => {
  it('turns the squares plain and back, its name unchanged', async () => {
    const user = userEvent.setup()
    render(<SquaresToggle />)
    const toggle = screen.getByRole('button', { name: 'Cases unies' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(useBoardStore.getState().squares).toBe('plain')
    expect(screen.getByRole('button', { name: 'Cases unies' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(toggle)
    expect(useBoardStore.getState().squares).toBe('hatched')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('ticks its box only while the squares are plain', async () => {
    const user = userEvent.setup()
    const { container } = render(<SquaresToggle />)
    expect(container.querySelector('svg')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Cases unies' }))
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
