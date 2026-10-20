import { fonts, typeScale } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'
import { expect, test } from './csp'

/**
 * Every word a page sets is on the type scale, and every figurine is drawn as
 * its face cuts it.
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

// The figurine face's family as the stack names it, without its quotes.
const FIGURINE_FAMILY = fonts.figurine[0].replace(/"/g, '')

for (const width of [1440, 390]) {
  for (const address of ADDRESSES) {
    test(`${address} sets its text on the type scale, and its figurines as cut, at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(address, { waitUntil: 'networkidle' })

      const { runs, figurines } = await page.evaluate((figurineFamily) => {
        const firstFamily = (element: Element) =>
          getComputedStyle(element).fontFamily.split(',')[0]!.trim().replace(/"/g, '')
        const runs: Array<{ size: number; text: string }> = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent?.trim()
          const element = node.parentElement
          if (!text || !element || element.getClientRects().length === 0) continue
          if (element.closest('.sr-only, [data-square]')) continue
          const nav = element.closest('nav')
          if (nav && getComputedStyle(nav).position === 'fixed') continue
          if (firstFamily(element) === figurineFamily) continue
          runs.push({
            size: Number.parseFloat(getComputedStyle(element).fontSize),
            text: text.slice(0, 40),
          })
        }
        // The figurine face has one weight and one style, so a figurine in a
        // bold move or an italic caption was faked bold or slanted.
        const figurines = [...document.querySelectorAll('*')]
          .filter(
            (element) => element.textContent?.trim() && firstFamily(element) === figurineFamily,
          )
          .map((element) => ({
            text: element.textContent!.trim().slice(0, 12),
            synthesis: getComputedStyle(element).fontSynthesis,
          }))
        return { runs, figurines }
      }, FIGURINE_FAMILY)

      // The controls: a page that rendered no text, or a check that found no
      // figurine, would pass on nothing. On a phone the tab bar draws a figurine
      // on every page, so there is always one to read there.
      expect(runs.length).toBeGreaterThan(5)
      if (width < 1024) expect(figurines.length).toBeGreaterThan(0)

      expect(runs.filter(({ size }) => !SCALE.includes(size))).toEqual([])
      expect(figurines.filter(({ synthesis }) => synthesis !== 'none')).toEqual([])
    })
  }
}
