// Relative rather than the usual '@' alias: vite.config.ts imports this file to
// build the sitemap, and esbuild resolves the config outside the app's alias
// map. Keeping the list in one place is worth the one exception.
import { ROUTES, type RoutePath } from './routes'

/**
 * Per-page title and indexability.
 *
 * Every route serves the same HTML, so without this the whole site presents one
 * title to a search engine and to anyone scanning their tabs. Titles are set
 * from here as the route changes.
 *
 * `indexable` is the same list the sitemap is built from: pages behind a login,
 * or reached only from an email, have nothing to offer a search result and
 * should not be advertised.
 */
export interface PageMeta {
  title: string
  indexable: boolean
}

const SUFFIX = 'ChessTrainer AI'

export const PAGE_META: Record<RoutePath, PageMeta> = {
  [ROUTES.home]: {
    title: 'ChessTrainer AI — Apprenez les échecs avec un coach intelligent',
    indexable: true,
  },
  [ROUTES.coach]: { title: `Coach IA — analyse de vos parties · ${SUFFIX}`, indexable: true },
  [ROUTES.battle]: { title: `Affrontement — défiez l'IA · ${SUFFIX}`, indexable: true },
  [ROUTES.puzzle]: { title: `Puzzles tactiques · ${SUFFIX}`, indexable: true },
  [ROUTES.hunt]: { title: `Chasse aux Pièces · ${SUFFIX}`, indexable: true },
  // Behind RequireAuth: a crawler following this is redirected to the sign-in
  // screen, so listing it would advertise a page no search engine can read.
  [ROUTES.leaderboard]: { title: `Classement mondial · ${SUFFIX}`, indexable: false },
  [ROUTES.legal]: { title: `Mentions légales · ${SUFFIX}`, indexable: true },
  [ROUTES.privacy]: { title: `Politique de confidentialité · ${SUFFIX}`, indexable: true },
  // Nothing below is worth a search result: they need an account, or a link
  // that arrived by email.
  [ROUTES.profile]: { title: `Profil · ${SUFFIX}`, indexable: false },
  [ROUTES.login]: { title: `Connexion · ${SUFFIX}`, indexable: false },
  [ROUTES.register]: { title: `Créer un compte · ${SUFFIX}`, indexable: false },
  [ROUTES.forgotPassword]: { title: `Mot de passe oublié · ${SUFFIX}`, indexable: false },
  [ROUTES.resetPassword]: { title: `Nouveau mot de passe · ${SUFFIX}`, indexable: false },
}

/**
 * What to show for an address that matches no route.
 *
 * Without it the previous page's title stays on screen, so a mistyped URL wears
 * the name of wherever the visitor came from — and a direct visit wears the home
 * page's.
 */
export const NOT_FOUND_META: PageMeta = { title: `Page introuvable · ${SUFFIX}`, indexable: false }

/** The pages a sitemap should list, in route order. */
export const INDEXABLE_ROUTES: RoutePath[] = (Object.keys(PAGE_META) as RoutePath[]).filter(
  (path) => PAGE_META[path].indexable,
)
