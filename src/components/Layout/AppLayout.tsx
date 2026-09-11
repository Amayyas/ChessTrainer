import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import RouteErrorBoundary from '@/components/RouteErrorBoundary'
import BottomBar from '@/components/Layout/BottomBar'
import Footer from '@/components/Layout/Footer'
import Sidebar from '@/components/Layout/Sidebar'
import SkipLink from '@/components/Layout/SkipLink'
import { pageTransition, pageVariants } from '@/lib/motion'

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

          {/* One footer for the whole site. It used to exist three times over —
              the sidebar's links on desktop, a bare pair here for the screens
              where the sidebar is hidden, and the landing's own. */}
          <Footer />
        </div>
      </main>
    </div>
  )
}
