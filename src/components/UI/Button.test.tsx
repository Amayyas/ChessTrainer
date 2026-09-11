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

  it('lends its styling to the child element when asChild is set', async () => {
    render(
      <Button asChild variant="outline">
        <a href="/jouer">Jouer</a>
      </Button>,
    )

    // The point of asChild: one element, an anchor, wearing the button's
    // classes. A button wrapping a link would be two controls in the
    // accessibility tree and invalid HTML besides.
    const link = screen.getByRole('link', { name: 'Jouer' })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(link).toHaveClass('rounded-xl')
  })

  it('keeps form-control attributes off the element asChild renders', () => {
    render(
      <Button asChild>
        <a href="/jouer">Jouer</a>
      </Button>,
    )

    // `type` and `disabled` belong to form controls. Spelled onto an anchor
    // they mean nothing, and React warns on the boolean one.
    const link = screen.getByRole('link', { name: 'Jouer' })
    expect(link).not.toHaveAttribute('type')
    expect(link).not.toHaveAttribute('disabled')
  })

  it('lets a later className override a variant class', () => {
    render(<Button className="rounded-full">Jouer</Button>)

    // The reason cn() gained tailwind-merge. Joined by hand the element would
    // carry rounded-xl and rounded-full at once, and the winner would be
    // whichever rule Tailwind emitted last rather than the caller's.
    const button = screen.getByRole('button', { name: 'Jouer' })
    expect(button).toHaveClass('rounded-full')
    expect(button).not.toHaveClass('rounded-xl')
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
