import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import BottomBar from '@/components/Layout/BottomBar'
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
      <main id="contenu" className="min-w-[375px] px-4 pb-20 pt-6 md:pb-8 md:pl-64 md:pr-8">
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
        </div>
      </main>
    </div>
  )
}
