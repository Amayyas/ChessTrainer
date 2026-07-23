import Spinner from '@/components/UI/Spinner'

/**
 * Shown while a lazily loaded route chunk is fetched. It reserves a tall,
 * centred area so swapping it for the page causes no jarring layout shift.
 */
export default function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" className="text-or" label="Chargement de la page" />
    </div>
  )
}
