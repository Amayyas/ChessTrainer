import { render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RequireAuth from '@/features/auth/RequireAuth'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

// The guard is inert without a backend, and the tests deliberately run with
// none configured, so it is forced on here to exercise the redirect at all.
vi.mock('@/lib/supabase', async () => ({
  ...(await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')),
  isSupabaseConfigured: true,
}))

const signedIn = { user: { id: 'u1' } } as unknown as Session

/** Reports the path and the state the guard handed to the login screen. */
function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '(aucun)'
  return <p>connexion, origine : {from}</p>
}

/**
 * The layout animates route changes, which keeps a leaving route mounted for
 * the length of its exit transition. That is what turned a redirect rendered as
 * <Navigate> into a loop, so the tests reproduce it rather than mounting the
 * guard bare.
 */
function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Animated />
    </MemoryRouter>,
  )
}

function Animated() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname}>
        <Routes location={location}>
          <Route
            path={ROUTES.leaderboard}
            element={
              <RequireAuth>
                <p>classement mondial</p>
              </RequireAuth>
            }
          />
          <Route path={ROUTES.login} element={<LoginProbe />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({ isReady: true, session: null })
  })

  it('sends a visitor without a session to the login screen', async () => {
    renderApp(ROUTES.leaderboard)
    expect(await screen.findByText(/connexion, origine/)).toBeInTheDocument()
  })

  it('records the page that was blocked, not the login screen itself', async () => {
    // The bug this covers: the guard survives the exit animation, and reading
    // the location at redirect time then reported /login as its own origin, so
    // signing in returned the player to the form they had just filled in.
    renderApp(ROUTES.leaderboard)
    expect(
      await screen.findByText(`connexion, origine : ${ROUTES.leaderboard}`),
    ).toBeInTheDocument()
  })

  it('records where it was mounted, even if the location moves under it', async () => {
    // The heart of the bug, reproduced without the animation that revealed it:
    // the layout keeps a leaving route mounted, so the guard outlives the
    // navigation it triggered. Rendering it outside the Routes reproduces that
    // survival — if it reads the location at redirect time instead of at mount,
    // it records /login as its own origin.
    const seen: (string | undefined)[] = []

    function Probe() {
      const location = useLocation()
      seen.push((location.state as { from?: string } | null)?.from)
      return <span>chemin : {location.pathname}</span>
    }

    render(
      <MemoryRouter initialEntries={[ROUTES.leaderboard]}>
        {/* Outside <Routes>, so navigating does not unmount it. */}
        <RequireAuth>
          <p>classement mondial</p>
        </RequireAuth>
        <Probe />
      </MemoryRouter>,
    )

    expect(await screen.findByText(`chemin : ${ROUTES.login}`)).toBeInTheDocument()
    // Every state the login screen was ever handed must name the blocked page.
    const recorded = seen.filter((from): from is string => from !== undefined)
    expect(recorded.length).toBeGreaterThan(0)
    expect(recorded.every((from) => from === ROUTES.leaderboard)).toBe(true)
  })

  it('redirects once rather than on every render', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    renderApp(ROUTES.leaderboard)
    await screen.findByText(/connexion, origine/)
    // A redirect rendered as an element fired on each render and ran away; a
    // couple of calls is a redirect, hundreds is the loop coming back.
    expect(replaceState.mock.calls.length).toBeLessThan(5)
    replaceState.mockRestore()
  })

  it('lets a signed-in player through', async () => {
    useAuthStore.setState({ isReady: true, session: signedIn })
    renderApp(ROUTES.leaderboard)
    expect(await screen.findByText('classement mondial')).toBeInTheDocument()
  })

  it('waits instead of redirecting while the stored session is still unknown', () => {
    useAuthStore.setState({ isReady: false, session: null })
    renderApp(ROUTES.leaderboard)
    // Redirecting here would bounce a signed-in player on every refresh.
    expect(screen.queryByText(/connexion, origine/)).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: /session/i })).toBeInTheDocument()
  })
})
