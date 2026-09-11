import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import RouteErrorBoundary from '@/components/RouteErrorBoundary'
import BottomBar from '@/components/Layout/BottomBar'
import Sidebar from '@/components/Layout/Sidebar'
import SkipLink from '@/components/Layout/SkipLink'
import { pageTransition, pageVariants } from '@/lib/motion'
import { ROUTES } from '@/routes'

export default function AppLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-dvh bg-ivoire">
      <SkipLink />
      <Sidebar />
      <BottomBar />

      {/* pb-20 clears the mobile bottom bar; md:pl-64 clears the desktop sidebar. */}
      <main id="contenu" className="px-4 pb-20 pt-6 md:pb-8 md:pl-64 md:pr-8">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={reduceMotion ? undefined : pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              {/* Catches a chunk that failed to load, or a page that threw,
                  without losing the shell around it. Remounts with the
                  motion.div on every navigation, so it never sticks. */}
              <RouteErrorBoundary>{outlet}</RouteErrorBoundary>
            </motion.div>
          </AnimatePresence>

          {/* The page footer, at every width — it used to live in the sidebar
              on desktop too, duplicated here for mobile where the sidebar is
              hidden. The landing carries its own footer with the same links,
              so it opts out. */}
          {location.pathname !== ROUTES.home && (
            <p className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ardoise">
              <Link to={ROUTES.legal} className="underline underline-offset-2">
                Mentions légales
              </Link>
              <Link to={ROUTES.privacy} className="underline underline-offset-2">
                Confidentialité
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
