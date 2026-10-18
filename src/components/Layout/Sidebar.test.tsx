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
    // The button's primary variant, on a sidebar marked as a dark surface so
    // that it swaps to paper on ebony rather than drawing ink on ebony.
    expect(signIn).toHaveAttribute('data-variant', 'primary')
    expect(signIn.closest('.theme-inverse')).not.toBeNull()
  })
})
