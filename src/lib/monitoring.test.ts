import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * What the real Sentry SDK sends once startMonitoring has configured it.
 *
 * The privacy policy says only errors are transmitted — no audience, no
 * performance measurement. The SDK's defaults disagree: its BrowserSession
 * integration sends a `session` envelope on every page load, error or not,
 * which is a visit count by another name. Production was measured sending one
 * per page view while the policy said otherwise.
 *
 * So this runs the actual SDK, not a mock of it, with only the transport
 * replaced by one that records each envelope's item types. Reading the init
 * options instead would trust that an option does what its name says.
 */

const sent: string[][] = []

vi.mock('@sentry/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sentry/react')>()
  return {
    ...actual,
    init: (options: Parameters<typeof actual.init>[0]) =>
      actual.init({
        ...options,
        transport: (transportOptions) =>
          actual.createTransport(transportOptions, async (request) => {
            sent.push(itemTypes(request.body))
            return { statusCode: 200 }
          }),
      }),
  }
})

/** The `type` of every item in a serialised envelope. */
function itemTypes(body: string | Uint8Array): string[] {
  const text = typeof body === 'string' ? body : new TextDecoder().decode(body)
  return text
    .split('\n')
    .slice(1)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as { type?: unknown }
        return typeof parsed.type === 'string' ? [parsed.type] : []
      } catch {
        return []
      }
    })
}

async function start() {
  vi.stubEnv('VITE_SENTRY_DSN', 'https://public@o0.ingest.de.sentry.io/0')
  // The client drops any session without a release. Production has one — the
  // Sentry Vite plugin injects it as window.SENTRY_RELEASE at build time, which
  // is where the client reads it — so the test provides it the same way.
  // Without it no session is ever sent, and the assertion below passes for
  // that reason alone: measured, it did.
  vi.stubGlobal('SENTRY_RELEASE', { id: 'test-release' })
  vi.resetModules()
  const monitoring = await import('@/lib/monitoring')
  await monitoring.startMonitoring()
  const sentry = await import('@sentry/react')
  return { monitoring, sentry }
}

describe('startMonitoring', () => {
  beforeEach(() => {
    sent.length = 0
  })

  afterEach(async () => {
    const sentry = await import('@sentry/react')
    await sentry.getClient()?.close()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends nothing as the player moves between pages without an error', async () => {
    const { sentry } = await start()
    // BrowserSession defers the first page's session until the browser is
    // idle, which jsdom never reports, but sends one at once on every history
    // change — what the router does on each navigation, and what production
    // was measured sending.
    window.history.pushState({}, '', '/coach')
    window.history.pushState({}, '', '/battle')
    await sentry.flush(2000)
    expect(sent.flat()).not.toContain('session')
  })

  it('still reports an error', async () => {
    // The control. If the recording transport saw nothing at all, the test
    // above would pass for that reason alone.
    const { monitoring, sentry } = await start()
    await monitoring.reportError(new Error('boom'))
    await sentry.flush(2000)
    expect(sent.flat()).toContain('event')
    expect(sent.flat()).not.toContain('session')
  })
})
