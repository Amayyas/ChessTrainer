import { ROUTES } from '@/routes'
import { expect, test } from './csp'

/**
 * Every route loaded as a fresh document, under the policy.
 *
 * The smoke tests reach some pages only by client-side navigation, which never
 * fetches that page's HTML: a script inlined into mentions-legales.html, or
 * into the app.html shell that every unlisted address falls back to, would go
 * unseen. Here each address is its own document load, so the fixture in
 * ./csp.ts reads every HTML file the build writes. The route list is the app's
 * own table, so a new route is covered without anyone adding it here.
 */

const ADDRESSES = [...Object.values(ROUTES), '/no-such-page']

for (const address of ADDRESSES) {
  test(`${address} loads under the CSP without a violation`, async ({ page }) => {
    const errors: Error[] = []
    page.on('pageerror', (error) => errors.push(error))

    const response = await page.goto(address, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    // React mounted, so the policy was checked against the running app rather
    // than a page whose bundle never ran. Content in #root does not prove it:
    // index.html ships the landing prerendered there. Both createRoot and
    // hydrateRoot mark their container with a __reactContainer$ key, which
    // only a bundle that ran can have put there.
    await page.waitForFunction(() =>
      Object.keys(document.getElementById('root') ?? {}).some((key) =>
        key.startsWith('__reactContainer$'),
      ),
    )
    await expect(page.locator('#root > *').first()).toBeVisible()
    expect(errors).toEqual([])
  })
}
