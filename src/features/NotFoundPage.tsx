import { Link } from 'react-router-dom'
import { ROUTES } from '@/routes'

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl py-12 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-ebene text-4xl text-or"
      >
        ♘
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold text-ebene">Page introuvable</h1>
      <p className="mt-3 text-ardoise">Ce coup n'est pas legal. Retour a la case depart.</p>
      <Link
        to={ROUTES.home}
        className="mt-6 inline-block rounded-lg bg-ebene px-5 py-2.5 text-sm font-semibold text-ivoire transition-colors hover:bg-ebene/90"
      >
        Retour a l'accueil
      </Link>
    </section>
  )
}
