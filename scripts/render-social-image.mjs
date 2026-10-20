/**
 * Renders public/og-image.png, the picture a link to the site shows when it is
 * shared: 1200 × 630, set as the landing's masthead is — the promise in
 * capitals, the nameplate, the double rule, the modes in the section bar, the
 * tagline in italic — in Newsreader, ink on paper.
 *
 * Every word and colour is read from the data the site sets them from: the
 * brand and the palette in src/lib/design-tokens.ts, the modes' titles in
 * src/features/home/modes.ts. What was read is written into the image as a
 * text chunk, and design-tokens.test.ts fails when it no longer matches the
 * data, so a renamed mode or a new tagline cannot leave an old picture behind:
 *
 *   node scripts/render-social-image.mjs
 *
 * Playwright's Chromium draws it; nothing is fetched from the network.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { crc32 } from 'node:zlib'
import { chromium } from '@playwright/test'

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))

function read(source, pattern, what) {
  const found = pattern.exec(source)
  if (!found) throw new Error(`render-social-image: no ${what} found`)
  return found[1]
}

const tokens = readFileSync(root('src/lib/design-tokens.ts'), 'utf8')
const brandBlock = read(tokens, /export const brand = \{([\s\S]*?)\} as const/, 'brand')
const colour = (name) =>
  read(tokens, new RegExp(`\\b${name}: \\{[^}]*?DEFAULT: '(#[0-9A-Fa-f]{6})'`), `${name} colour`)
const modesSource = readFileSync(root('src/features/home/modes.ts'), 'utf8')

/** Everything the picture says and is drawn in. */
const source = {
  name: read(brandBlock, /\bname: '([^']+)'/, 'brand name'),
  tagline: read(brandBlock, /\btagline: '([^']+)'/, 'tagline'),
  promise: read(brandBlock, /\bpromise: '([^']+)'/, 'promise'),
  modes: [...modesSource.matchAll(/\btitle: '([^']+)'/g)].map((match) => match[1]),
  paper: colour('paper'),
  ink: colour('ink'),
}
if (source.modes.length === 0) throw new Error('render-social-image: no mode titles found')

function face(file, style, weight) {
  const data = readFileSync(root(`node_modules/${file}`)).toString('base64')
  return `@font-face { font-family: 'Newsreader'; font-style: ${style}; font-weight: ${weight};
    src: url(data:font/woff2;base64,${data}) format('woff2'); }`
}

const { paper, ink } = source
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  ${face('@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2', 'normal', '200 800')}
  ${face('@fontsource/newsreader/files/newsreader-latin-400-italic.woff2', 'italic', '400')}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${paper}; color: ${ink};
    font-family: 'Newsreader'; font-kerning: normal; }
  .page { position: absolute; inset: 64px 84px; display: flex; flex-direction: column; }
  .caps { font-size: 22px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .line { text-align: center; padding-bottom: 16px; opacity: 0.8;
    border-bottom: 1px solid color-mix(in srgb, ${ink} 30%, transparent); }
  .nameplate { margin: 36px 0 30px; text-align: center; font-size: 150px; font-weight: 700;
    line-height: 1; letter-spacing: -0.012em; }
  .double { height: 14px; border-top: 6px solid ${ink}; border-bottom: 2px solid ${ink}; }
  .sections { display: flex; justify-content: center; gap: 22px; padding: 18px 0;
    border-bottom: 2px solid ${ink}; }
  .tagline { margin: auto 0; text-align: center; font-size: 46px; font-style: italic;
    line-height: 1.2; }
</style></head><body><div class="page">
  <div class="line caps">${source.promise}</div>
  <div class="nameplate">${source.name}</div>
  <div class="double"></div>
  <div class="sections caps">${source.modes.map((mode) => `<span>${mode}</span>`).join('<span>·</span>')}</div>
  <p class="tagline">${source.tagline}</p>
</div></body></html>`

/**
 * The PNG with a tEXt chunk, keyword "Source", holding what it was drawn from,
 * set before IEND. tEXt is Latin-1, so the JSON escapes everything past ASCII.
 */
function withSource(png) {
  const text = JSON.stringify(source).replace(
    /[\u007f-\uffff]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
  const data = Buffer.concat([Buffer.from('Source\0', 'latin1'), Buffer.from(text, 'latin1')])
  const type = Buffer.from('tEXt', 'latin1')
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  type.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), 8 + data.length)
  const iend = png.length - 12
  return Buffer.concat([png.subarray(0, iend), chunk, png.subarray(iend)])
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
const faces = await page.evaluate(() => [...document.fonts].map((font) => font.status))
if (faces.some((status) => status !== 'loaded')) {
  throw new Error(`render-social-image: a face did not load (${faces.join(', ')})`)
}
writeFileSync(root('public/og-image.png'), withSource(await page.screenshot({ type: 'png' })))
await browser.close()
console.log('Wrote public/og-image.png')
