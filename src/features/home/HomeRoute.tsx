import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import LandingPage from '@/features/home/LandingPage'
import { authLinkType } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * What '/' renders.
 *
 * The landing sells the product to someone who has not signed up — "sans créer
 * de compte", a "Créer un compte" button. Showing it to a signed-in player on
 * every visit to the bare domain is the wrong screen: they get sent to their
 * dashboard instead, the way the old '/' behaved before the split.
 *
 * The redirect waits for the stored session to be read (`isReady`), or a
 * signed-in player would see the landing flash on every refresh before being
 * bounced. It runs from an effect, not <Navigate>, for the reason RequireAuth
 * documents: the layout keeps this subtree mounted through its exit animation,
 * and <Navigate> re-fires every render until React gives up.
 *
 * It also stands down while an emailed auth link is being processed. Supabase
 * drops a recovery or confirmation link on '/' whenever its redirect target is
 * not on the allow list, and the link carries a live session — so without this
 * check HomeRoute would send that visitor to the dashboard, past AuthLinkLanding
 * and the password screen the link was for. AuthLinkLanding owns that case.
 */
export default function HomeRoute() {
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const navigate = useNavigate()
  const redirected = useRef(false)

  const goToDashboard = isReady && session !== null && authLinkType === null

  useEffect(() => {
    if (!goToDashboard || redirected.current) return
    redirected.current = true
    navigate(ROUTES.dashboard, { replace: true })
  }, [goToDashboard, navigate])

  // Render the landing while signed out, and also for the frame between the
  // session resolving and the redirect firing — it is the page most visitors
  // here want, and it is already in the eager bundle.
  return <LandingPage />
}
