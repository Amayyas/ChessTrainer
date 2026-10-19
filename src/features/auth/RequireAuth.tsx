import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, Spinner } from '@/components/UI'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Route guard for the pages that need an account. Only the
 * leaderboard is behind it: every game mode stays open to guests.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const location = useLocation()
  const navigate = useNavigate()

  // Wait for the stored session before deciding, or a signed-in player would be
  // bounced to the login screen on every refresh.
  const blocked = isSupabaseConfigured && isReady && !session

  /**
   * The page that was actually asked for, captured when this guard mounts.
   *
   * It used to be read at redirect time. While the layout animated route
   * changes, this component stayed mounted through the exit transition, and by
   * then the location already said `/login`: the login page was recorded as its
   * own origin, and signing in sent the player back to the form they had just
   * completed. Captured at mount, it is right however long the subtree
   * outlives its route.
   */
  const requestedPath = useRef(location.pathname)

  // Redirecting from an effect rather than rendering <Navigate>: that element
  // navigates on every render, and while an exit animation kept this subtree
  // alive it fired in a loop — over a thousand times, until React gave up with
  // "maximum update depth exceeded". The animation is gone; the effect stays,
  // since it runs once, when access is refused, whatever keeps the subtree up.
  useEffect(() => {
    if (!blocked) return
    navigate(ROUTES.login, { replace: true, state: { from: requestedPath.current } })
  }, [blocked, navigate])

  if (!isSupabaseConfigured) {
    return (
      <Box className="mx-auto max-w-md text-center">
        <h1 className="text-title font-semibold">Classement indisponible</h1>
        <p className="mt-2 text-caption italic text-ink-soft">
          Le classement mondial a besoin d'un serveur, qui n'est pas configuré ici. Vos scores
          restent enregistrés localement dans le mode Chasse.
        </p>
      </Box>
    )
  }

  // Either the session is still being read, or the redirect above is under way.
  if (!isReady || !session) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Vérification de la session" />
      </div>
    )
  }

  return <>{children}</>
}
