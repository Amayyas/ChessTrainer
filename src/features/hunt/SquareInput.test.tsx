import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SquareInput from '@/features/hunt/SquareInput'

const field = () => screen.getByRole('textbox', { name: 'Jouer au clavier' })

/** The sentence under the field, its non-breaking spaces made plain. */
const said = () =>
  screen.getByText(/./, { selector: '[aria-live]' }).textContent!.replace(/\u00a0/g, ' ')

function renderInput(championSquare: string | null = 'd4', moves = ['c6', 'e6', 'b5']) {
  const onMove = vi.fn(() => true)
  render(<SquareInput moves={moves} championSquare={championSquare} onMove={onMove} />)
  return onMove
}

describe('SquareInput', () => {
  it('sends the champion to the square typed, in either case', async () => {
    const user = userEvent.setup()
    const onMove = renderInput()
    await user.type(field(), 'c6{Enter}')
    expect(onMove).toHaveBeenCalledWith('c6')
    expect(field()).toHaveValue('')
    await user.type(field(), 'B5{Enter}')
    expect(onMove).toHaveBeenLastCalledWith('b5')
  })

  it('says text that is no square is not one', async () => {
    const user = userEvent.setup()
    const onMove = renderInput()
    await user.type(field(), 'z9{Enter}')
    expect(said()).toBe(
      '« z9 » n’est pas une case : tapez sa colonne puis sa rangée, par exemple d5.',
    )
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(onMove).not.toHaveBeenCalled()
  })

  it('says a square out of the champion’s reach is', async () => {
    const user = userEvent.setup()
    const onMove = renderInput()
    await user.type(field(), 'a1{Enter}')
    expect(said()).toBe('Votre pièce ne peut pas aller en a1.')
    expect(onMove).not.toHaveBeenCalled()
  })

  it('waits for the champion while it reappears, without blaming the text', async () => {
    const user = userEvent.setup()
    const onMove = renderInput(null, [])
    await user.type(field(), 'c6{Enter}')
    expect(said()).toBe('Votre pièce reparaît dans un instant.')
    expect(field()).not.toHaveAttribute('aria-invalid')
    expect(onMove).not.toHaveBeenCalled()
  })
})
