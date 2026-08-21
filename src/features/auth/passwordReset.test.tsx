import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import { useAuthStore } from '@/store/useAuthStore'

vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')
  return { ...actual, isSupabaseConfigured: true }
})

function renderPage(page: React.ReactElement) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

beforeEach(() => {
  useAuthStore.setState({ error: null, session: null, isReady: true })
})

describe('ForgotPasswordPage', () => {
  it('says the same thing whether or not the address has an account', async () => {
    // Confirming that an address is unknown would turn this form into a way to
    // test which addresses are registered here, and accounts carry a public
    // pseudonym and a ranking.
    const request = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({ requestPasswordReset: request })

    renderPage(<ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'personne@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(screen.getByRole('status').textContent).toContain('Si un compte existe')
    expect(request).toHaveBeenCalledWith('personne@example.com')
  })

  it('offers no Google button, which cannot help here', () => {
    renderPage(<ForgotPasswordPage />)
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  it('refuses two passwords that do not match, before any request', () => {
    const update = vi.fn()
    useAuthStore.setState({
      updatePassword: update,
      session: { user: { id: 'u1' } } as never,
    })

    renderPage(<ResetPasswordPage />)
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'motdepasse' },
    })
    fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: 'motdepassX' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByRole('alert').textContent).toContain('ne correspondent pas')
    expect(update).not.toHaveBeenCalled()
  })

  it('explains an expired link instead of failing on submit', () => {
    // Recovery links expire and are single use. Without the session the token
    // creates, the form would only fail once the player had typed a password
    // twice.
    useAuthStore.setState({ isReady: true, session: null })
    renderPage(<ResetPasswordPage />)

    expect(screen.getByRole('alert').textContent).toContain("Ce lien n'est plus valide")
    expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument()
  })
})
