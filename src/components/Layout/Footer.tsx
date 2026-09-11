import { Link } from 'react-router-dom'
import { brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'

/**
 * The site footer, rendered once by AppLayout so every route carries the same
 * one — the legal notice has to be reachable from anywhere, and the AGPL wants
 * the source reachable with it. It used to live only on the landing, with the
 * other pages making do with a bare pair of links.
 */
export default function Footer() {
  return (
    <footer className="mt-14 border-t border-ebene/10 pt-8 text-sm text-ardoise">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display font-bold text-ebene">{brand.fullName}</p>
        <nav aria-label="Pied de page" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to={ROUTES.legal} className="underline-offset-2 hover:text-ebene hover:underline">
            Mentions légales
          </Link>
          <Link to={ROUTES.privacy} className="underline-offset-2 hover:text-ebene hover:underline">
            Confidentialité
          </Link>
          <a
            href={brand.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-ebene hover:underline"
          >
            Code source (AGPL)
          </a>
        </nav>
      </div>
    </footer>
  )
}
