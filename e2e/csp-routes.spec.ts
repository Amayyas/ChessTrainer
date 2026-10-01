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
    // React mounted: app.html ships an empty #root, so a child proves the
    // bundle ran rather than the policy being checked against a blank page.
    await expect(page.locator('#root > *').first()).toBeVisible()
    expect(errors).toEqual([])
  })
}
