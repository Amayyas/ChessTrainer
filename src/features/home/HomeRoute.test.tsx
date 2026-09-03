import { render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

// authLinkType is read from the URL fragment once at module load. The mock lets
// a test put HomeRoute in the "an emailed auth link just landed on /" state.
const linkType = vi.hoisted(() => ({ value: null as 'recovery' | 'signup' | null }))
vi.mock('@/lib/supabase', async () => ({
  ...(await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')),
  get authLinkType() {
    return linkType.value
  },
}))

const { default: HomeRoute } = await import('@/features/home/HomeRoute')

const signedIn = { user: { id: 'u1' } } as unknown as Session

function DashboardProbe() {
  return <p>tableau de bord</p>
}

function CurrentPath() {
  return <p>chemin : {useLocation().pathname}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentPath />
      <Routes>
        <Route path={ROUTES.home} element={<HomeRoute />} />
        <Route path={ROUTES.dashboard} element={<DashboardProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomeRoute', () => {
  afterEach(() => {
    useAuthStore.setState({ isReady: false, session: null })
    linkType.value = null
  })

  it('shows the landing to a signed-out visitor', () => {
    useAuthStore.setState({ isReady: true, session: null })
    renderAt(ROUTES.home)

    expect(
      screen.getByRole('heading', { level: 1, name: /Apprenez les échecs/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('chemin : /')).toBeInTheDocument()
  })

  it('redirects a signed-in visitor to the dashboard', async () => {
    useAuthStore.setState({ isReady: true, session: signedIn })
    renderAt(ROUTES.home)

    expect(await screen.findByText('tableau de bord')).toBeInTheDocument()
    expect(screen.getByText('chemin : /dashboard')).toBeInTheDocument()
  })

  it('waits for the session to be read before deciding', () => {
    // isReady false: the stored session has not come back yet. Redirecting now
    // would flash the landing at someone who is about to be recognised.
    useAuthStore.setState({ isReady: false, session: null })
    renderAt(ROUTES.home)

    expect(screen.getByText('chemin : /')).toBeInTheDocument()
    expect(screen.queryByText('tableau de bord')).not.toBeInTheDocument()
  })

  it('stands down while an emailed auth link is being processed', () => {
    // A recovery link Supabase drops on '/' carries a live session. Without the
    // authLinkType check HomeRoute would send the visitor to the dashboard,
    // past the password screen the link was for — the bug AuthLinkLanding fixes.
    linkType.value = 'recovery'
    useAuthStore.setState({ isReady: true, session: signedIn })
    renderAt(ROUTES.home)

    expect(screen.getByText('chemin : /')).toBeInTheDocument()
    expect(screen.queryByText('tableau de bord')).not.toBeInTheDocument()
  })
})
