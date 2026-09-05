import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SCRIPT_URL } from '@/engine/stockfishEngine'

/**
 * The `/*` response headers, and the Content-Security-Policy in particular.
 *
 * The Supabase session is kept in localStorage, so an XSS would hand over the
 * account, not just the page — which makes the CSP the one header here that
 * turns an injection into a non-event. Nothing else verifies it: Netlify does
 * not validate the file, and a directive dropped in an unrelated edit would
 * only show up as a broken engine or a silently permissive policy in
 * production.
 *
 * Read as text rather than parsed: the repository has no TOML parser among its
 * dependencies, and the block below is small and fully controlled — the same
 * trade `ciNpmPin.test.ts` makes for the workflow YAML.
 */

const NETLIFY = resolve(process.cwd(), 'netlify.toml')

/** The `[headers.values]` body of the `for = "/*"` block. */
function globalHeaderValues(toml: string): string {
  const lines = toml.split('\n')
  const start = lines.findIndex((line) => line.trim() === 'for = "/*"')
  if (start === -1) return ''
  const valuesAt = lines.findIndex(
    (line, index) => index > start && line.trim() === '[headers.values]',
  )
  if (valuesAt === -1) return ''
  const body: string[] = []
  for (const line of lines.slice(valuesAt + 1)) {
    // Any new top-level or nested table header ends this block.
    if (/^\s*\[/.test(line)) break
    body.push(line)
  }
  return body.join('\n')
}

describe('global response headers', () => {
  const toml = readFileSync(NETLIFY, 'utf8')
  const values = globalHeaderValues(toml)

  const csp = /Content-Security-Policy(?:-Report-Only)? = "([^"]+)"/.exec(values)?.[1] ?? ''

  // Guards the guard: an extractor that stopped matching would report every
  // assertion below as satisfied on an empty string.
  it('finds the /* header block and its values', () => {
    expect(values).toMatch(/X-Frame-Options = "DENY"/)
    expect(values).toMatch(/Permissions-Policy = /)
    expect(csp.length).toBeGreaterThan(0)
  })

  it('ships the CSP in Report-Only until a deploy clears it', () => {
    // Flipping to enforcement is a deliberate step: it needs the Vite
    // module-preload polyfill handled first (see netlify.toml), so this test
    // is the checkpoint that has to be updated by hand when that happens.
    expect(values).toMatch(/Content-Security-Policy-Report-Only = /)
    expect(values).not.toMatch(/Content-Security-Policy = /)
  })

  it('locks the ambient sources down to nothing', () => {
    expect(csp).toMatch(/(?:^|; )default-src 'self'(?:;|$)/)
    expect(csp).toMatch(/(?:^|; )object-src 'none'(?:;|$)/)
    expect(csp).toMatch(/(?:^|; )base-uri 'self'(?:;|$)/)
    // Must agree with X-Frame-Options above, or the two headers disagree about
    // whether the app may be framed.
    expect(csp).toMatch(/(?:^|; )frame-ancestors 'none'(?:;|$)/)
  })

  it('allows the Stockfish worker the engine actually loads', () => {
    // The engine is `new Worker(DEFAULT_SCRIPT_URL)`. As long as that stays a
    // same-origin absolute path, worker-src 'self' covers it; a move to a CDN
    // or a blob: URL would need this policy widened in step.
    expect(DEFAULT_SCRIPT_URL.startsWith('/')).toBe(true)
    const workerSrc = /(?:^|; )worker-src ([^;]+)/.exec(csp)?.[1] ?? ''
    expect(workerSrc).toMatch(/'self'/)
    // WebAssembly.instantiate in the worker needs this in script-src, or the
    // engine never reports readiness once the policy is enforced.
    expect(csp).toMatch(/script-src [^;]*'wasm-unsafe-eval'/)
  })

  it('allows the backends the app talks to, and no more', () => {
    const connectSrc = /(?:^|; )connect-src ([^;]+)/.exec(csp)?.[1] ?? ''
    expect(connectSrc).toMatch(/'self'/)
    // Supabase REST + Auth over https, Realtime over wss.
    expect(connectSrc).toMatch(/https:\/\/\*\.supabase\.co/)
    expect(connectSrc).toMatch(/wss:\/\/\*\.supabase\.co/)
    // Sentry's EU ingest — the region the project is pinned to.
    expect(connectSrc).toMatch(/https:\/\/\*\.ingest\.de\.sentry\.io/)
    // default-src is already 'self'; connect-src must not fall back to a
    // wildcard that would let an injected script exfiltrate anywhere.
    expect(connectSrc).not.toMatch(/(?:^| )\*(?: |$)/)
    expect(connectSrc).not.toMatch(/https:(?: |$)/)
  })

  it('denies the powerful features the app never uses', () => {
    const permissions = /Permissions-Policy = "([^"]+)"/.exec(values)?.[1] ?? ''
    for (const feature of ['camera', 'microphone', 'geolocation']) {
      expect(permissions).toMatch(new RegExp(`${feature}=\\(\\)`))
    }
  })
})
