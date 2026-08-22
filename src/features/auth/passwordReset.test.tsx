import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import RegisterPage from '@/features/auth/RegisterPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import { useAuthStore } from '@/store/useAuthStore'

// No environment is configured under test, so the real client is null. A stand
// in lets the store's own actions run instead of only their mocked doubles.
// vi.hoisted, because vi.mock is lifted above ordinary declarations and would
// otherwise reference these before they exist.
const { resetPasswordForEmail, updateUser } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')
  return {
    ...actual,
    isSupabaseConfigured: true,
    supabase: { auth: { resetPasswordForEmail, updateUser } },
  }
})

function renderPage(page: React.ReactElement) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

// The store is a module singleton, so a mocked action installed by one test
// would otherwise still be in place for the next one and make the suite
// order-dependent. Snapshot it once, restore it whole before each test.
const initialState = useAuthStore.getState()

beforeEach(() => {
  useAuthStore.setState(initialState, true)
  useAuthStore.setState({ error: null, session: null, isReady: true, isRecovering: false })
  resetPasswordForEmail.mockReset()
  updateUser.mockReset()
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
    useAuthStore.setState({ updatePassword: update, isRecovering: true })

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
    // Recovery links expire and are single use. Without the flag the token
    // raises, the form would only fail once the player had typed a password
    // twice.
    useAuthStore.setState({ isReady: true, isRecovering: false })
    renderPage(<ResetPasswordPage />)

    expect(screen.getByRole('alert').textContent).toContain("Ce lien n'est plus valide")
    expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument()
  })

  it('stays shut for someone merely signed in', () => {
    // A session alone must not admit anyone: everybody signed in has one, so
    // gating on it would publish a change-password screen to every visitor —
    // including Google accounts that have no password to change.
    useAuthStore.setState({
      isReady: true,
      isRecovering: false,
      session: { user: { id: 'u1' } } as never,
    })
    renderPage(<ResetPasswordPage />)

    expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument()
  })
})

describe('requestPasswordReset', () => {
  it('surfaces a real failure instead of confirming a mail that never left', async () => {
    // Supabase already answers an unknown address with success, so anything
    // that comes back is a genuine failure — a bad redirect URL, a
    // misconfigured key. An earlier version filtered on the word "invalid" and
    // would have shown a confirmation for exactly those.
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'Invalid redirect URL' } })

    const ok = await initialState.requestPasswordReset('joueur@example.com')

    expect(ok).toBe(false)
    expect(useAuthStore.getState().error).not.toBeNull()
  })

  it('confirms when the request goes through', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    await expect(initialState.requestPasswordReset('joueur@example.com')).resolves.toBe(true)
  })
})

describe('RegisterPage', () => {
  it('sends the player to their profile only when a session came back', async () => {
    const signUp = vi.fn().mockResolvedValue('signed-in')
    useAuthStore.setState({ signUp })

    renderPage(<RegisterPage />)
    fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: 'amamas' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'motdepasse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => expect(signUp).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('asks the player to confirm their address instead of showing a guest profile', async () => {
    // The bug this covers: the page navigated to the profile whatever came
    // back. With email confirmation on there is no session yet, so a player who
    // had just registered was shown the guest screen — "Vous jouez en invité" —
    // seconds after creating an account.
    useAuthStore.setState({ signUp: vi.fn().mockResolvedValue('awaiting-confirmation') })

    renderPage(<RegisterPage />)
    fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: 'amamas' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'motdepasse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(screen.getByRole('status').textContent).toContain('a@example.com')
    expect(screen.queryByRole('button', { name: 'Créer mon compte' })).not.toBeInTheDocument()
  })
})
