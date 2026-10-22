import { Link } from 'react-router-dom'
import DoubleRule from '@/components/UI/DoubleRule'
import { brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'

const LINK =
  'inline-block text-kicker font-semibold uppercase leading-[44px] underline-offset-4 transition-colors hover:text-rubric hover:underline'

/**
 * The site footer, rendered once by AppLayout so every route carries the same
 * one — the legal notice has to be reachable from anywhere, and the AGPL wants
 * the source reachable with it. It used to live only on the landing, with the
 * other pages making do with a bare pair of links.
 *
 * Set as the foot of a paper: the double rule, the title, and the links in
 * capitals between middle dots, which become a plain list on a phone.
 */
export default function Footer() {
  return (
    <footer className="mt-12 sm:mt-[4.5rem]">
      <DoubleRule />
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 pb-3 pt-3.5 sm:pb-7">
        <p className="text-heading font-bold">{brand.fullName}</p>
        <nav aria-label="Pied de page">
          <ul className="flex flex-col items-start sm:flex-row sm:flex-wrap sm:items-center">
            <li>
              <Link to={ROUTES.legal} className={LINK}>
                Mentions légales
              </Link>
            </li>
            <li className="sm:before:mx-3.5 sm:before:font-bold sm:before:text-ink-faint sm:before:content-['·']">
              <Link to={ROUTES.privacy} className={LINK}>
                Confidentialité
              </Link>
            </li>
            <li className="sm:before:mx-3.5 sm:before:font-bold sm:before:text-ink-faint sm:before:content-['·']">
              <a href={brand.sourceUrl} target="_blank" rel="noreferrer" className={LINK}>
                Code source (AGPL)
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
