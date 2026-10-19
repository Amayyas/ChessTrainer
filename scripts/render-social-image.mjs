/**
 * Renders public/og-image.png, the picture a link to the site shows when it is
 * shared: 1200 × 630, set as the landing's masthead is — the nameplate between
 * a line of capitals and the double rule, the modes in the section bar, the
 * tagline in italic — in Newsreader, ink on paper.
 *
 * The colours are read from src/lib/design-tokens.ts and the faces from the
 * packages the site serves, so a change of either is one run of this away:
 *
 *   node scripts/render-social-image.mjs
 *
 * Playwright's Chromium draws it; nothing is fetched from the network.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))

const tokens = readFileSync(root('src/lib/design-tokens.ts'), 'utf8')
function colour(name) {
  const found = new RegExp(`\\b${name}: \\{[^}]*?DEFAULT: '(#[0-9A-Fa-f]{6})'`).exec(tokens)
  if (!found) throw new Error(`render-social-image: no ${name} colour in design-tokens.ts`)
  return found[1]
}
const paper = colour('paper')
const ink = colour('ink')

function face(file, style, weight) {
  const data = readFileSync(root(`node_modules/${file}`)).toString('base64')
  return `@font-face { font-family: 'Newsreader'; font-style: ${style}; font-weight: ${weight};
    src: url(data:font/woff2;base64,${data}) format('woff2'); }`
}

const MODES = ['Coach', 'Affrontement', 'Puzzles', 'Chasse aux pièces']

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  ${face('@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2', 'normal', '200 800')}
  ${face('@fontsource/newsreader/files/newsreader-latin-400-italic.woff2', 'italic', '400')}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${paper}; color: ${ink};
    font-family: 'Newsreader'; font-kerning: normal; }
  .page { position: absolute; inset: 64px 84px; display: flex; flex-direction: column; }
  .caps { font-size: 22px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .line { display: flex; justify-content: space-between; padding-bottom: 16px;
    border-bottom: 1px solid color-mix(in srgb, ${ink} 30%, transparent); opacity: 0.8; }
  .nameplate { margin: 36px 0 30px; text-align: center; font-size: 150px; font-weight: 700;
    line-height: 1; letter-spacing: -0.012em; }
  .double { height: 14px; border-top: 6px solid ${ink}; border-bottom: 2px solid ${ink}; }
  .sections { display: flex; justify-content: center; gap: 22px; padding: 18px 0;
    border-bottom: 2px solid ${ink}; }
  .tagline { margin: auto 0; text-align: center; font-size: 46px; font-style: italic;
    line-height: 1.2; }
</style></head><body><div class="page">
  <div class="line caps"><span>Gratuit, sans compte obligatoire</span><span>chesstrainer.fr</span></div>
  <div class="nameplate">ChessTrainer</div>
  <div class="double"></div>
  <div class="sections caps">${MODES.map((mode) => `<span>${mode}</span>`).join('<span>·</span>')}</div>
  <p class="tagline">Apprenez les échecs avec un coach intelligent</p>
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
const faces = await page.evaluate(() => [...document.fonts].map((font) => font.status))
if (faces.some((status) => status !== 'loaded')) {
  throw new Error(`render-social-image: a face did not load (${faces.join(', ')})`)
}
writeFileSync(root('public/og-image.png'), await page.screenshot({ type: 'png' }))
await browser.close()
console.log('Wrote public/og-image.png')
