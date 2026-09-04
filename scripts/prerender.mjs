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
// Run after `vite build` and the matching `vite build --ssr`, which is what
// `npm run build` wires up. See src/entry-server.tsx for what gets rendered.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const indexPath = resolve(distDir, 'index.html')
const shellPath = resolve(distDir, 'app.html')

copyFileSync(indexPath, shellPath)

const { render } = await import(resolve(import.meta.dirname, '..', 'dist-ssr', 'entry-server.js'))
const appHtml = render('/')

const template = readFileSync(indexPath, 'utf-8')
if (!template.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html does not have the expected empty #root — check the template')
}
const prerendered = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
writeFileSync(indexPath, prerendered)

console.log(`Prerendered / into ${indexPath} (${appHtml.length} bytes of markup)`)
