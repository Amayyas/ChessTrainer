import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authLinkType } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Sends someone arriving from an emailed link to the screen that link was for.
 *
 * Supabase only redirects to addresses on its allow list; anything else falls
 * back to the project's Site URL. A recovery link opened from a deploy preview,
 * or from any origin nobody remembered to register, therefore lands on the home
 * page — signed in, token already spent, and no way to set a password. The same
 * happens to a confirmation link.
 *
 * Rather than depend on that list being complete, this reads the type off the
 * link itself and routes accordingly, so the flow finishes wherever the visitor
 * was dropped.
 */
export default function AuthLinkLanding() {
  const navigate = useNavigate()
  const isReady = useAuthStore((state) => state.isReady)
  // Once only: the visitor is free to navigate away afterwards, and a second
  // pass would drag them back.
  const handled = useRef(false)

  useEffect(() => {
    if (!isReady || handled.current || !authLinkType) return
    handled.current = true
    navigate(authLinkType === 'recovery' ? ROUTES.resetPassword : ROUTES.profile, {
      replace: true,
    })
  }, [isReady, navigate])

  return null
}
