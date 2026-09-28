#!/usr/bin/env node
// Bakes the server-rendered markup for '/' into dist/index.html, so the first
// paint does not wait for the JS bundle to download, parse and execute.
//
// Every other route still ships an empty shell — dist/app.html, a copy of the
// unmodified client build made before this runs — because the SPA rewrite in
// netlify.toml answers every address with one file, and splicing landing
// markup into that file would hand every route a server render that does not
// match what it mounts, which is a hydration mismatch, not a faster paint.
//
// The shell's <head> describes the home page, though, so it is not what a
// crawler should read at /coach. Each indexable route also gets a file of its
// own — dist/coach.html for /coach, which Netlify serves ahead of the rewrite —
// holding the same empty shell under that page's title, og:url and canonical.
// Routes left out of the sitemap still fall back to app.html; they carry a
// noindex, set once the JS runs, and nothing a search result could use.
//
// Run after `vite build` and the matching `vite build --ssr`, which is what
// `npm run build` wires up. See src/entry-server.tsx for what gets rendered.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const indexPath = resolve(distDir, 'index.html')
const shellPath = resolve(distDir, 'app.html')

copyFileSync(indexPath, shellPath)

const { render, routeHead, INDEXABLE_ROUTES } = await import(
  resolve(import.meta.dirname, '..', 'dist-ssr', 'entry-server.js')
)
const appHtml = render('/')

const template = readFileSync(indexPath, 'utf-8')
if (!template.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html does not have the expected empty #root — check the template')
}
const prerendered = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
writeFileSync(indexPath, routeHead(prerendered, '/'))

console.log(`Prerendered / into ${indexPath} (${appHtml.length} bytes of markup)`)

for (const route of INDEXABLE_ROUTES) {
  if (route === '/') continue
  const file = resolve(distDir, `${route.slice(1)}.html`)
  // A file of that name from public/ would be served in place of the page, and
  // overwriting it would hide which of the two was meant. 'wx' refuses in the
  // same call that writes, rather than checking first and writing after.
  try {
    writeFileSync(file, routeHead(template, route), { flag: 'wx' })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    throw new Error(`${file} already exists — it would shadow ${route}`)
  }
  console.log(`Wrote the ${route} shell to ${file}`)
}
