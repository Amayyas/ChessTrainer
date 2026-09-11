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

      {/* md:pl-64 clears the desktop sidebar. */}
      <main id="contenu" className="px-4 pt-6 md:pl-64 md:pr-8">
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
        </div>
      </main>

      {/* One footer for the whole site — it used to exist three times over: the
          sidebar's links on desktop, a bare pair for the screens where the
          sidebar is hidden, and the landing's own. Kept outside <main> on
          purpose: a <footer> nested in main is a generic element, and only a
          top-level one maps to the contentinfo landmark. pb-20 clears the
          mobile bottom bar. */}
      <div className="px-4 pb-20 md:pb-8 md:pl-64 md:pr-8">
        <div className="mx-auto max-w-6xl">
          <Footer />
        </div>
      </div>
    </div>
  )
}
