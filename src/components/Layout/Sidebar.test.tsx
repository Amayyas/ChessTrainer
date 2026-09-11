import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { ROUTES } from '@/routes'

/**
 * The sign-in control at the foot of the sidebar used to be a NavLink carrying
 * a hand-written copy of the button's classes. It is now the Button itself,
 * lent to the link through asChild, and these pin the two things that made the
 * copy a bug waiting to happen: it must still be a link, and it must be styled
 * by the design system rather than by a string that drifts from it.
 */
describe('Sidebar', () => {
  it('offers signing in as a link, not a button', async () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.dashboard]}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1 })

    const signIn = await screen.findByRole('link', { name: 'Se connecter' })
    expect(signIn).toHaveAttribute('href', ROUTES.login)
    // Nesting an anchor inside a button is invalid HTML and puts two controls
    // in the accessibility tree; asChild exists to avoid exactly that.
    expect(signIn.closest('button')).toBeNull()
  })

  it('styles that link with the button, not with a copy of its classes', async () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.dashboard]}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1 })

    const signIn = await screen.findByRole('link', { name: 'Se connecter' })
    // The gold pair and the corner come from buttonVariants. The copy this
    // replaced had neither the shadow nor the same padding.
    expect(signIn).toHaveClass('bg-primary', 'text-primary-foreground', 'rounded-xl')
  })
})
