import { Link } from 'react-router-dom'
import { Card } from '@/components/UI'
import { ROUTES } from '@/routes'

export default function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-ebene text-4xl text-or"
      >
        ♘
      </span>
      <h1 className="font-display text-3xl font-bold text-ebene">Page introuvable</h1>
      <p className="mt-3 text-ardoise">Ce coup n'est pas légal. Retour à la case départ.</p>
      <Link
        to={ROUTES.home}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-ebene px-5 text-sm font-semibold text-ivoire transition-colors hover:bg-ebene-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        Retour à l'accueil
      </Link>
    </Card>
  )
}
