import Spinner from '@/components/UI/Spinner'

/**
 * Shown while a lazily loaded route chunk is fetched. It reserves a tall,
 * centred area so swapping it for the page causes no jarring layout shift.
 *
 * `data-route-fallback` is what the layout keys on to keep the footer out of
 * sight meanwhile; see AppLayout.
 */
export default function RouteFallback() {
  return (
    <div data-route-fallback="" className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" className="text-ink" label="Chargement de la page" />
    </div>
  )
}
