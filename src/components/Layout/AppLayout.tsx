import { useLocation, useOutlet } from 'react-router-dom'
import RouteErrorBoundary from '@/components/RouteErrorBoundary'
import BottomBar from '@/components/Layout/BottomBar'
import Footer from '@/components/Layout/Footer'
import Masthead from '@/components/Layout/Masthead'
import { PAGE_WIDTH } from '@/components/Layout/pageWidth'
import SkipLink from '@/components/Layout/SkipLink'
import { ROUTES } from '@/routes'

export default function AppLayout() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    // A column the height of the viewport, so the footer below can be pushed to
    // the bottom of a short page instead of floating up under the content.
    <div className="flex min-h-dvh flex-col bg-paper">
      <SkipLink />
      {/* The landing carries the full masthead, every other page the compact
          one. */}
      <Masthead variant={location.pathname === ROUTES.home ? 'full' : 'compact'} />
      <BottomBar />

      {/* flex-1 takes the slack, which is what keeps the footer down. */}
      <main id="contenu" className="flex-1 pt-6 sm:pt-9">
        <div className={PAGE_WIDTH}>
          {/* Catches a chunk that failed to load, or a page that threw,
              without losing the shell around it. Keyed on the path, so it
              remounts on every navigation and never sticks. A page arrives
              without a transition: nothing enters on arrival. */}
          <RouteErrorBoundary key={location.pathname}>{outlet}</RouteErrorBoundary>
        </div>
      </main>

      {/* One footer for the whole site — it used to exist three times over: the
          sidebar's links on desktop, a bare pair for the screens where the
          sidebar is hidden, and the landing's own. Kept outside <main> on
          purpose: a <footer> nested in main is a generic element, and only a
          top-level one maps to the contentinfo landmark. The bottom padding
          clears the bottom bar, below lg.

          It stays invisible while a page is loading. Under the spinner it sat
          in view, and the page then pushed it off the screen: a layout shift
          that grew with the page, 0.17 on /coach. Hidden, it is not painted,
          and an element that was not painted does not shift when it appears —
          on a short page as on a long one. */}
      <div className="pb-16 lg:pb-0 [main:has([data-route-fallback])~&]:invisible">
        <div className={PAGE_WIDTH}>
          <Footer />
        </div>
      </div>
    </div>
  )
}
