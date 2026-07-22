import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
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

  // Wait for the stored session before deciding, or a signed-in player would be
  // bounced to the login screen on every refresh.
  if (!isReady) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Vérification de la session" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
