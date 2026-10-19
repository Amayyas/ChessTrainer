import { typeScale } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'
import { expect, test } from './csp'

/**
 * Every word a page sets is on the type scale.
 *
 * jsdom computes no styles, so only a browser can say what size text came out
 * at, and nothing else fails when it is off: the running text of the legal
 * pages, two paragraphs of the landing and the tabs were set at the browser's
 * 16 px, which is not on the scale, until the rendered pages were measured.
 *
 * Three things are set off the scale on purpose and are left out: the
 * figurines, pictograms drawn at the size of what they stand beside; the
 * board's coordinates, which are the board's own; and the labels of the tab bar
 * fixed to the foot of a phone's screen, set below the scale so that six fit
 * across 320 px.
 */

const SCALE = Object.values(typeScale).map(([size]) => Number.parseFloat(size) * 16)
const ADDRESSES = [...Object.values(ROUTES), '/no-such-page']

for (const width of [1440, 390]) {
  for (const address of ADDRESSES) {
    test(`${address} sets its text on the type scale at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(address, { waitUntil: 'networkidle' })

      const runs = await page.evaluate(() => {
        const found: Array<{ size: number; text: string }> = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent?.trim()
          const element = node.parentElement
          if (!text || !element || element.getClientRects().length === 0) continue
          if (element.closest('.sr-only, [data-square]')) continue
          const nav = element.closest('nav')
          if (nav && getComputedStyle(nav).position === 'fixed') continue
          const style = getComputedStyle(element)
          if (style.fontFamily.replace(/"/g, '').startsWith('Figurines')) continue
          found.push({ size: Number.parseFloat(style.fontSize), text: text.slice(0, 40) })
        }
        return found
      })

      // The control: a page that rendered no text would pass on nothing.
      expect(runs.length).toBeGreaterThan(5)
      expect(runs.filter(({ size }) => !SCALE.includes(size))).toEqual([])
    })
  }
}
