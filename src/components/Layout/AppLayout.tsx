import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useLocation, useOutlet } from 'react-router-dom'
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
              {outlet}
            </motion.div>
          </AnimatePresence>

          {/* The sidebar holds these on desktop, but it is hidden below md and
              a legal notice has to be reachable from every screen. The landing
              carries its own footer with the same links, so it opts out. */}
          {location.pathname !== ROUTES.home && (
            <p className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ardoise md:hidden">
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
