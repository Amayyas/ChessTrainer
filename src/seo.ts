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
  // The dashboard is a signed-in view reached from the menu, not an address a
  // visitor or a crawler arrives at: nothing to offer a search result.
  [ROUTES.dashboard]: { title: `Tableau de bord · ${SUFFIX}`, indexable: false },
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The built HTML document with its head rewritten for one indexable page.
 *
 * DocumentHead sets the same three things once the JS has run, but the HTML a
 * crawler fetches first is the shell, and the shell describes the home page:
 * before rendering, every deep route carried the home page's title and og:url
 * and no canonical at all, so six addresses read as copies of one. The build
 * writes one file per indexable route with this, so the first fetch already
 * names the page and claims its own address.
 *
 * `siteUrl` is the configured domain. Without one there is no canonical and the
 * og:url stays as the template has it, for the reason DocumentHead gives: a
 * relative canonical is not a valid one.
 */
export function withRouteHead(html: string, path: RoutePath, siteUrl: string): string {
  const site = siteUrl.replace(/\/$/, '')
  const title = /<title>[^<]*<\/title>/
  const ogUrl = /<meta property="og:url" content="[^"]*" \/>/
  if (!title.test(html) || !ogUrl.test(html) || !html.includes('</head>')) {
    throw new Error('the HTML template lost its <title>, og:url or </head> — check index.html')
  }
  if (/<link rel="canonical"/.test(html)) {
    throw new Error('the HTML template already carries a canonical — it would be duplicated')
  }

  let out = html.replace(title, `<title>${escapeHtml(PAGE_META[path].title)}</title>`)
  if (!site) return out
  const url = escapeHtml(`${site}${path}`)
  out = out.replace(ogUrl, `<meta property="og:url" content="${url}" />`)
  return out.replace('</head>', `  <link rel="canonical" href="${url}" />\n  </head>`)
}
