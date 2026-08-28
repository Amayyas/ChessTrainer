import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthLinkLanding from '@/features/auth/AuthLinkLanding'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

const { linkType } = vi.hoisted(() => ({ linkType: { current: null as string | null } }))

vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')
  return {
    ...actual,
    isSupabaseConfigured: true,
    get authLinkType() {
      return linkType.current
    },
  }
})

/** Renders the lander on the home page, where a fallback redirect drops people. */
function renderAt() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.home]}>
      <AuthLinkLanding />
      <Routes>
        <Route path={ROUTES.home} element={<p>accueil</p>} />
        <Route path={ROUTES.resetPassword} element={<p>ecran de reinitialisation</p>} />
        <Route path={ROUTES.profile} element={<p>profil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  linkType.current = null
  useAuthStore.setState({ isReady: true })
})

describe('AuthLinkLanding', () => {
  it('carries a recovery link to the reset screen wherever it landed', async () => {
    // The bug this covers: Supabase falls back to the project's Site URL when
    // the redirect target is not on its allow list, so the link opened from a
    // deploy preview dropped the player on the home page with a spent token and
    // nothing to use it on.
    linkType.current = 'recovery'
    renderAt()
    await waitFor(() => expect(screen.getByText('ecran de reinitialisation')).toBeInTheDocument())
  })

  it('carries a confirmation link to the profile', async () => {
    linkType.current = 'signup'
    renderAt()
    await waitFor(() => expect(screen.getByText('profil')).toBeInTheDocument())
  })

  it('leaves an ordinary visit alone', () => {
    renderAt()
    expect(screen.getByText('accueil')).toBeInTheDocument()
  })

  it('waits until the stored session has been read', () => {
    // Redirecting first would land on the reset screen before the recovery flag
    // is set, and it would announce an expired link.
    linkType.current = 'recovery'
    useAuthStore.setState({ isReady: false })
    renderAt()
    expect(screen.getByText('accueil')).toBeInTheDocument()
  })
})
