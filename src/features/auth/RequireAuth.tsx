import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, Spinner } from '@/components/UI'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Route guard for the pages that need an account (spec section 2.6). Only the
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
   * It cannot be read at redirect time: the layout animates route changes, so
   * this component stays mounted through the exit transition and by then the
   * location already says `/login`. Reading it later recorded the login page as
   * its own origin, and signing in sent the player back to the form they had
   * just completed.
   */
  const requestedPath = useRef(location.pathname)

  // Redirecting from an effect rather than rendering <Navigate>: that element
  // navigates on every render, and while the exit animation keeps this subtree
  // alive it fired in a loop — over a thousand times, until React gave up with
  // "maximum update depth exceeded". This runs once, when access is refused.
  useEffect(() => {
    if (!blocked) return
    navigate(ROUTES.login, { replace: true, state: { from: requestedPath.current } })
  }, [blocked, navigate])

  if (!isSupabaseConfigured) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-ebene">Classement indisponible</h1>
        <p className="mt-2 text-sm text-ardoise">
          Le classement mondial a besoin d'un serveur, qui n'est pas configuré ici. Vos scores
          restent enregistrés localement dans le mode Chasse.
        </p>
      </Card>
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
