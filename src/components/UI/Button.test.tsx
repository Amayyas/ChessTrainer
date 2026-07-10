import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from '@/components/UI/Button'

describe('Button', () => {
  it('renders its label and defaults to type="button"', () => {
    render(<Button>Jouer</Button>)
    const button = screen.getByRole('button', { name: 'Jouer' })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('fires onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Valider</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled and announces busy while loading', () => {
    render(<Button isLoading>Charger</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Bloqué
      </Button>,
    )
    await userEvent.click(screen.getByRole('button')).catch(() => {})
    expect(onClick).not.toHaveBeenCalled()
  })
})
