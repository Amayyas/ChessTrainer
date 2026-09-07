/**
 * Serves ./dist the way Netlify serves it, for Lighthouse and the Playwright
 * smoke tests to run against the real production build.
 *
 * Two behaviours matter and `vite preview` gets both wrong:
 *
 *  - A request for a route like /coach must fall back to app.html (the empty
 *    shell), not index.html (which carries the prerendered landing markup and
 *    would hydrate into a mismatch) — the `to = "/app.html" status = 200`
 *    rewrite in netlify.toml. A real file always wins over it.
 *  - Text assets must be gzipped, as Netlify's CDN serves them. Without it
 *    Lighthouse downloads 534 KB of JS instead of ~160 KB and the performance
 *    score drops ~25 points — the run would measure the server, not the build.
 *
 * The tree is read and pre-compressed into memory at startup.
 *
 * Usage: node scripts/serve-dist.mjs [port]   (default 4173)
 */
import { createServer } from 'node:http'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const PORT = Number(process.argv[2] ?? 4173)

const CONTENT_TYPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/vnd.microsoft.icon',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt', '.wasm'])

/** `/assets/index-abc.js` -> { raw, gzip }, for every file under dist/. */
const files = new Map()
;(function load(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      load(full)
      continue
    }
    const key = `/${relative(DIST, full).split('\\').join('/')}`
    const raw = readFileSync(full)
    files.set(key, { raw, gzip: COMPRESSIBLE.has(extname(key)) ? gzipSync(raw) : null })
  }
})(DIST)

function send(res, key, acceptsGzip) {
  const file = files.get(key)
  const ext = extname(key)
  const useGzip = acceptsGzip && file.gzip
  const body = useGzip ? file.gzip : file.raw
  const headers = {
    'content-type': CONTENT_TYPE[ext] ?? 'application/octet-stream',
    'content-length': body.length,
  }
  if (useGzip) headers['content-encoding'] = 'gzip'
  // Mirror netlify.toml closely enough for Lighthouse's cache-policy audit and
  // a header check to see production behaviour.
  if (key.startsWith('/assets/')) headers['cache-control'] = 'public, max-age=31536000, immutable'
  else if (ext === '.html') headers['cache-control'] = 'public, max-age=0, must-revalidate'
  res.writeHead(200, headers).end(body)
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const rel = normalize(decodeURIComponent(pathname)).split('\\').join('/')
  const key = rel === '/' || rel === '' ? '/index.html' : rel
  const acceptsGzip = (req.headers['accept-encoding'] ?? '').includes('gzip')

  if (files.has(key)) return send(res, key, acceptsGzip)
  // The SPA rewrite: every unknown path is the app shell, HTTP 200.
  if (files.has('/app.html')) return send(res, '/app.html', acceptsGzip)
  res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
})

server.listen(PORT, () =>
  console.log(`serving dist/ on http://localhost:${PORT} (${files.size} files)`),
)
