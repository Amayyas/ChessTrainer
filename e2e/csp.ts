import { expect, test as base } from '@playwright/test'
import { DEFAULT_SCRIPT_URL } from '@/engine/stockfishEngine'

/**
 * Every smoke test runs under the Content-Security-Policy netlify.toml
 * declares — scripts/serve-dist.mjs sends it — and fails on any violation,
 * naming the directive and the blocked URL.
 *
 * Under the enforced policy a violation also blocks what caused it, so most
 * would break a test anyway — but not all: a blocked request a component
 * swallows, or an image that fails to load, still passes every assertion. The
 * event names the cause either way, and fires in Report-Only too, should the
 * policy ever be rolled back to it.
 *
 * Two places to listen, because a worker is not a window:
 *
 *  - Documents: a listener installed before any page script runs, so the
 *    violations raised while the page loads are not missed.
 *  - The Stockfish worker: it runs under the policy on its own script's
 *    response, and its violations fire on the worker's global scope only.
 *    Measured: a connect-src violation raised in the worker reached neither a
 *    document listener nor the console. So the worker's script is intercepted
 *    and the same listener is prepended to it. The response headers go through
 *    as served, bar the two that describe the original encoding, so the policy
 *    under test is still the served one.
 *
 * Both write a marked line to the console, which Playwright reports on the page
 * for workers as well.
 *
 * Two guards keep a clean result from being a vacuous one: every document and
 * the worker script must have arrived with a CSP header (without one there is
 * nothing to violate), and every worker the page starts must be one this
 * instrumented.
 */

const MARKER = '[csp-violation]'

/**
 * Runs in a window and in a worker alike: both have a global addEventListener.
 * A fixed string, nothing interpolated into it: it is code, injected into every
 * page and into the worker. The marker is spelled out and checked against
 * MARKER below instead.
 */
const LISTENER =
  "addEventListener('securitypolicyviolation', (e) => console.error('[csp-violation]' + JSON.stringify({ directive: e.effectiveDirective, blocked: e.blockedURI, source: e.sourceFile, line: e.lineNumber, disposition: e.disposition })));"
if (!LISTENER.includes(`'${MARKER}'`)) throw new Error('LISTENER does not log MARKER')

/** The worker scripts the app starts. A new one has to be added here. */
const WORKER_SCRIPTS = [DEFAULT_SCRIPT_URL]

function cspOf(headers: Record<string, string>): string | undefined {
  return headers['content-security-policy'] ?? headers['content-security-policy-report-only']
}

interface Violation {
  directive: string
  blocked: string
  source: string
  line: number
  disposition: string
}

function describe(v: Violation): string {
  return `${v.directive} blocked ${v.blocked || '(none)'} at ${v.source || '(unknown)'}:${v.line} [${v.disposition}]`
}

export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [
    async ({ context, page }, use) => {
      const violations = new Set<string>()
      const documentsWithoutCsp: string[] = []
      const workersWithoutCsp: string[] = []
      const instrumented = new Set<string>()
      const started: string[] = []

      await context.addInitScript(LISTENER)
      await context.route(
        (url) => WORKER_SCRIPTS.includes(url.pathname),
        async (route) => {
          const response = await route.fetch()
          if (!cspOf(response.headers())) workersWithoutCsp.push(route.request().url())
          instrumented.add(new URL(route.request().url()).pathname)
          // route.fetch() hands back the body decoded but the headers as sent,
          // gzip and the compressed length included. Measured: Chromium passed
          // both on to the worker with a 20 KB plain body and ran it anyway,
          // which is tolerance, not a contract. Every other header, the CSP
          // first, goes through as served.
          const headers = response.headers()
          delete headers['content-encoding']
          delete headers['content-length']
          await route.fulfill({
            response,
            headers,
            body: `${LISTENER}\n${await response.text()}`,
          })
        },
      )

      page.on('console', (message) => {
        const text = message.text()
        if (!text.startsWith(MARKER)) return
        violations.add(describe(JSON.parse(text.slice(MARKER.length)) as Violation))
      })
      page.on('response', (response) => {
        if (response.request().resourceType() !== 'document') return
        if (!cspOf(response.headers())) documentsWithoutCsp.push(response.url())
      })
      page.on('worker', (worker) => started.push(new URL(worker.url()).pathname))

      await use()

      expect(documentsWithoutCsp, 'documents served without a CSP header').toEqual([])
      expect(workersWithoutCsp, 'worker scripts served without a CSP header').toEqual([])
      expect(
        started.filter((path) => !instrumented.has(path)),
        'workers started without the CSP listener — add them to WORKER_SCRIPTS',
      ).toEqual([])
      expect([...violations], 'Content-Security-Policy violations').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
