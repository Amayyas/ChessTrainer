# How the site is served

ChessTrainer is a single-page app served as static files from a CDN, with one
page prerendered. This page covers what the build produces, how each address is
answered, what search engines and agents are told, the headers, and how the app
survives a deploy happening under a player's feet. The configuration is in
[`netlify.toml`](../netlify.toml); most of the decisions are explained in its
comments, and this page is the map.

## What the build produces

`npm run build` runs four steps:

1. `tsc --noEmit` — the type check.
2. `vite build` — the client build, into `dist/`.
3. `vite build --ssr src/entry-server.tsx` — a server build, into `dist-ssr/`,
   used only by the next step and never served.
4. [`scripts/prerender.mjs`](../scripts/prerender.mjs), which writes the HTML
   files described below.

The client build also generates `robots.txt`, `sitemap.xml` and `llms.txt` from
[`src/seo.ts`](../src/seo.ts) (the `discovery-files` plugin in
[`vite.config.ts`](../vite.config.ts)), rather than committing them. The sitemap
and `llms.txt` need absolute links, so a build without `VITE_SITE_URL` — every
local build and every fork — leaves them out instead of publishing files no
crawler can read.

## One page prerendered, the others as shells

| File in `dist/` | What it holds                                                     | Served for           |
| --------------- | ----------------------------------------------------------------- | -------------------- |
| `index.html`    | The landing page, server-rendered into `#root`                    | `/`                  |
| `coach.html`, … | The empty shell, under that page's own title, `og:url`, canonical | each indexable route |
| `app.html`      | The empty shell, as the client build made it                      | every other address  |

Only `/` is prerendered. It is the page a visitor and a crawler land on, and
baking its markup in means the first paint does not wait for the JavaScript to
download, parse and run. [`main.tsx`](../src/main.tsx) hydrates when `#root`
already has children and renders from scratch when it is empty.

Splicing the landing's markup into every address would hand each of them a
server render that does not match what mounts there — a hydration mismatch, not
a faster paint. So the other routes keep an empty `#root`.

The indexable routes still each get a file of their own. The shell's `<head>`
describes the home page, and before this a crawler fetching `/coach` read the
home page's title and no canonical, so every deep route looked like a copy of
`/`. `withRouteHead` in `src/seo.ts` writes the page's title, `og:url` and
canonical into a copy of the shell, and Netlify serves `coach.html` for the
extensionless `/coach`.

What [`entry-server.tsx`](../src/entry-server.tsx) renders must be exactly what
`main.tsx` mounts for the same URL, or hydration throws the markup away. A page
that should not appear in that first render — the board's code, say — waits on
[`useAfterLoad`](../src/hooks/useAfterLoad.ts), which is false on the server and
until the browser has loaded and gone idle.

## How Netlify answers an address

The `[[redirects]]` in `netlify.toml` are read top to bottom, and real files are
served before any rewrite applies:

1. `chesstrainer-ai.netlify.app/*` redirects (301) to the domain. A second live
   address would mean a second, silently divergent guest progression, since
   `localStorage` is scoped per origin, and duplicate pages for search engines.
   It sits first because the next rules match any host.
2. `/.well-known/*` answers 404. Agents and crawlers probe there for files a
   site declares; answering with the app's HTML and a 200 reads as a malformed
   file rather than as none.
3. `/*` rewrites to `app.html` with a 200 — client-side routing. Without it, a
   shared link, a bookmark or a reload of `/coach` would 404, and navigating
   from the home page would hide the problem entirely.

The site must be served from the root of a domain: the engine is loaded from
the absolute path `/stockfish/stockfish.js`.

## What search engines and agents are told

[`src/seo.ts`](../src/seo.ts) is the single source. `PAGE_META` gives every
route its title and says whether it is indexable; a test fails when a route has
no entry. From it come:

- **The titles**, set by `DocumentHead` as the route changes, and baked into
  each indexable page's file at build time.
- **`noindex`** on the routes that are not indexable, set once the JavaScript
  runs. Those pages need an account or arrive by email; they have nothing to
  offer a search result.
- **`sitemap.xml`**, listing the indexable routes.
- **`robots.txt`**, which allows everything and names the sitemap.
- **`llms.txt`**, a Markdown index for language-model agents: the site's name,
  the summary from `index.html`'s meta description, and a link to each
  indexable page under its title.

Add a route by adding it to `src/routes.ts`, to `PAGE_META` and to the
`<Routes>` in `App.tsx`; the sitemap, `llms.txt` and the per-route files follow.

## Headers

Every response carries the security headers set on `/*`: `nosniff`, a strict
referrer policy, `X-Frame-Options: DENY`, a `Permissions-Policy` that turns off
camera, microphone, location, payment and USB, and an **enforced**
Content-Security-Policy.

The CSP matters because the Supabase session lives in `localStorage`: an XSS
would be an account takeover. Each source it allows is justified in the comment
above it in `netlify.toml` — `'wasm-unsafe-eval'` for the engine, `'unsafe-inline'`
styles for the board and gauges, Supabase and Sentry's EU host in `connect-src`.
There is no report endpoint; the Playwright tests are the sink instead.
[`scripts/serve-dist.mjs`](../scripts/serve-dist.mjs) serves `dist/` under the
same headers, and [`e2e/csp.ts`](../e2e/csp.ts) fails any test that trips the
policy, in a page or in the engine's worker, on every route.

Caching comes in three tiers:

| Path            | Cache                     | Why                                                           |
| --------------- | ------------------------- | ------------------------------------------------------------- |
| everything else | revalidated on every load | an old `index.html` must not request chunks a deploy removed  |
| `/assets/*`     | a year, immutable         | Vite fingerprints the names, so a stale copy cannot be served |
| `/stockfish/*`  | a day, then revalidated   | fixed names, and a multi-megabyte engine worth reusing        |

**Netlify does not pick the most specific rule.** It applies every matching
rule and lets the last one win each header. The catch-all therefore comes
first and the narrow rules after it — the order looks backwards and is not.
With the catch-all last, production once served every fingerprinted asset with
`max-age=0`.

No COOP/COEP headers are sent: they are needed only for a threaded engine build,
and this app ships the single-threaded one.

[`scripts/check-deployed.mjs`](../scripts/check-deployed.mjs) checks what
production actually serves — see [releasing](releasing.md).

## What loads when

The initial bundle is kept small, and a budget enforces it
([`scripts/check-bundle-size.mjs`](../scripts/check-bundle-size.mjs), read from
the Vite manifest):

- **Every route but the home page is its own chunk**, loaded through
  `lazyWithRetry` in [`App.tsx`](../src/App.tsx). The home route is in the
  entry bundle, since it is what the prerendered markup hydrates.
- **Stockfish loads on demand**, in a Web Worker, when a mode first needs it.
  The home page never downloads the engine.
- **Sentry loads after the first render**, dynamically, and only when
  `VITE_SENTRY_DSN` is set. Native error listeners buffer whatever happens
  before it arrives.
- **The fonts** are self-hosted; the roman is preloaded, and the fallback faces
  are reshaped to its metrics so the page does not move when it arrives.

## Surviving a deploy

A deploy replaces the fingerprinted files. A player who loaded the page before
it, and navigates after, asks for a chunk that no longer exists. Three layers
answer, each for a different failure:

1. **`lazyWithRetry`** retries a failed dynamic import with a short backoff. It
   covers a transient failure — a flaky connection, a request that timed out.
2. **`installChunkReloadHandler`** ([`lib/chunkReload.ts`](../src/lib/chunkReload.ts))
   handles the chunk that is genuinely gone. `React.lazy` caches the rejection,
   so retrying the same URL cannot help; fresh HTML can. On Vite's
   `vite:preloadError` it reloads the page once. A second failure within a
   short cooldown is let through, so a broken deploy reaches the error screen
   rather than reloading forever.
3. **`RouteErrorBoundary`** catches what is left inside one route, so the
   masthead and navigation stay and "Réessayer" remounts the page. The root
   `ErrorBoundary` is the last resort and offers a full reload.

The HTML is revalidated on every load, which is what makes the reload in step 2
fetch the new fingerprints.

## Checking it locally

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build
npm run test:e2e   # serves dist/ the way Netlify does, on port 4173
```

The smoke tests run the real build in headless Chromium under the production
headers: the landing hydrates, the engine boots and replies, the CSP holds on
every route, nothing shifts while a slow page arrives on a phone, and every word
is on the type scale.
