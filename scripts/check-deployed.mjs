/**
 * Checks the deployed site is actually serving what it should.
 *
 * keepalive.yml watches Supabase; nothing watched the frontend. A deploy can
 * succeed and still ship a broken SPA rewrite, a sitemap that 404s, or drop the
 * security headers — and nobody notices until a visitor does. This is the
 * frontend counterpart: run it after a deploy, and on a schedule.
 *
 * The CSP is Report-Only, so this is also where the "read the console for a
 * week" verification gets a foothold: at least confirm the header is present
 * and shaped right.
 *
 * Usage: node scripts/check-deployed.mjs [base-url]   (default https://chesstrainer.fr)
 */
const BASE = (process.argv[2] ?? 'https://chesstrainer.fr').replace(/\/$/, '')

/** @type {{ name: string, run: () => Promise<void> }[]} */
const checks = []
const check = (name, run) => checks.push({ name, run })

async function get(path, init) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init })
  const body = await res.text()
  return { res, body, header: (n) => res.headers.get(n) ?? '' }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * The markup the prerender baked into #root, or '' when the shell is untouched.
 *
 * What tells index.html and app.html apart is whether #root has children —
 * nothing else does. Both carry the same <head>, so matching on the title or
 * the meta description finds the landing copy in every page the site serves,
 * including the empty shell: an assertion written that way cannot come out
 * wrong, and read `!includes(...)` it cannot come out right.
 */
function rootMarkup(body) {
  // Walk the <div> nesting from #root to its own closing tag. Slicing to
  // </body> and trimming one </div> instead would read anything appended after
  // the element — a script tag, a trailing comment — as prerendered markup, so
  // an empty shell would pass the landing check and fail the deep-route one.
  const OPEN = '<div id="root">'
  const start = body.indexOf(OPEN)
  if (start === -1) throw new Error('no #root in the document at all')

  const from = start + OPEN.length
  const tag = /<div\b|<\/div>/gi
  tag.lastIndex = from
  for (let depth = 1, m; (m = tag.exec(body));) {
    depth += m[0] === '</div>' ? -1 : 1
    if (depth === 0) return body.slice(from, m.index).trim()
  }
  throw new Error('#root is never closed — the document is truncated')
}

check('/ serves the prerendered landing', async () => {
  const { res, body, header } = await get('/')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(header('content-type').includes('text/html'), `content-type was ${header('content-type')}`)
  assert(
    rootMarkup(body).length > 0,
    'the prerendered landing markup is missing — did the prerender step run?',
  )
})

check('a deep route falls back to the app shell', async () => {
  const { res, body } = await get('/battle')
  assert(res.status === 200, `expected 200 (SPA rewrite), got ${res.status}`)
  assert(body.includes('<div id="root">'), 'the app shell is missing')
  assert(
    rootMarkup(body).length === 0,
    'a deep route got the landing markup, not app.html — the rewrite is wrong',
  )
})

check('/sitemap.xml is XML, not the SPA fallback', async () => {
  const { res, body, header } = await get('/sitemap.xml')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(header('content-type').includes('xml'), `content-type was ${header('content-type')}`)
  assert(body.trimStart().startsWith('<?xml'), 'body is not XML — the rewrite swallowed it')
  assert(body.includes(BASE), `sitemap <loc> entries do not point at ${BASE}`)
})

check('/robots.txt points at the sitemap', async () => {
  const { res, body, header } = await get('/robots.txt')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(
    header('content-type').includes('text/plain'),
    `content-type was ${header('content-type')}`,
  )
  assert(/^Sitemap:\s*https?:\/\//m.test(body), 'no Sitemap: line')
})

check('/ carries the security headers', async () => {
  const { header } = await get('/')
  assert(
    header('x-frame-options').toUpperCase() === 'DENY',
    `x-frame-options: ${header('x-frame-options')}`,
  )
  assert(
    header('x-content-type-options') === 'nosniff',
    `x-content-type-options: ${header('x-content-type-options')}`,
  )
  assert(header('referrer-policy') !== '', 'referrer-policy missing')
  assert(header('permissions-policy') !== '', 'permissions-policy missing')
  const csp = header('content-security-policy-report-only') || header('content-security-policy')
  assert(csp.includes("default-src 'self'"), 'CSP missing or not locked to self')
  // Netlify adds HSTS only when Force HTTPS is on — this confirms it is.
  assert(header('strict-transport-security').includes('max-age'), 'no HSTS — is Force HTTPS on?')
})

check('the HTML is revalidated, the fingerprinted assets are immutable', async () => {
  const { body, header } = await get('/')
  assert(
    /max-age=0|no-cache/.test(header('cache-control')),
    `HTML cache-control: ${header('cache-control')}`,
  )
  const asset = /["']\/assets\/[^"']+\.(?:js|css)["']/.exec(body)?.[0]?.slice(1, -1)
  assert(asset, 'could not find a fingerprinted asset in the page')
  const { header: assetHeader, res } = await get(asset)
  assert(res.status === 200, `${asset} returned ${res.status}`)
  assert(
    assetHeader('cache-control').includes('immutable'),
    `${asset} cache-control: ${assetHeader('cache-control')}`,
  )
})

check('the engine keeps its own cache rule', async () => {
  // /stockfish/* lost its day-long cache to the same catch-all that flattened
  // /assets/*, and nothing here noticed: the suite was all-green while the
  // engine was being revalidated on every load. The wasm is ~7 MB, so this is
  // the most expensive header on the site to get wrong.
  const { res, header } = await get('/stockfish/stockfish.js')
  assert(res.status === 200, `/stockfish/stockfish.js returned ${res.status}`)
  const maxAge = /max-age=(\d+)/.exec(header('cache-control'))?.[1]
  assert(
    maxAge !== undefined && Number(maxAge) >= 3600,
    `engine cache-control: ${header('cache-control') || '(none)'}`,
  )
})

check('the old netlify.app host redirects to the domain', async () => {
  const res = await fetch('https://chesstrainer-ai.netlify.app/', { redirect: 'manual' })
  assert([301, 308].includes(res.status), `expected a permanent redirect, got ${res.status}`)
  const target = res.headers.get('location') ?? ''
  // Compare the parsed origin, not a prefix: `https://chesstrainer.fr.evil.com`
  // starts with the domain too.
  assert(
    URL.canParse(target) && new URL(target).origin === BASE,
    `redirects to ${target || '(nothing)'}, not ${BASE}`,
  )
})

const results = await Promise.allSettled(checks.map((c) => c.run()))
let failed = 0
console.log(`\nchecking ${BASE}\n`)
results.forEach((result, i) => {
  const ok = result.status === 'fulfilled'
  if (!ok) failed += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${checks[i].name}`)
  if (!ok) console.log(`        ${result.reason.message}`)
})

if (failed) {
  console.error(`\n${failed} check(s) failed.\n`)
  process.exit(1)
}
console.log('\nall good.\n')
