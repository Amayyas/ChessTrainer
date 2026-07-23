/**
 * Bundle size guard.
 *
 * The specification rates "Stockfish bundle above 5 MB" as a highly probable risk
 * (section 06), with lazy loading of the worker as the mitigation. This script fails
 * if the initial bundle exceeds its budget, so a regression shows up on the PR that
 * introduces it rather than at delivery time.
 *
 * "Initial" means only what the first paint downloads: the entry chunk and the
 * chunks it statically imports, read from Vite's build manifest. The lazily
 * loaded route chunks (M9 code-splitting) and the on-demand Stockfish worker are
 * reported for visibility but do not count against the initial budget.
 */
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const KB = 1024

const BUDGETS = {
  // The first-load JavaScript: entry chunk plus its static imports.
  initialJs: { label: 'Initial JavaScript', maxGzipKb: 200 },
  // Everything the first paint loads on top of the JS.
  css: { label: 'CSS', maxGzipKb: 50 },
  // Loaded on demand when a mode that needs the engine is opened.
  stockfish: { label: 'Stockfish (on demand)', maxGzipKb: 5 * KB },
}

const gzipKb = (file) => gzipSync(readFileSync(join(DIST, file))).length / KB

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [relative(DIST, full)]
  })
}

let manifest
try {
  manifest = JSON.parse(readFileSync(join(DIST, '.vite/manifest.json'), 'utf8'))
} catch {
  console.error(`No build manifest in ${DIST}. Run "npm run build" first.`)
  process.exit(1)
}

// The initial set: the entry, plus every chunk reachable through static imports
// (never dynamicImports, which are the lazily loaded routes).
const entry = Object.values(manifest).find((chunk) => chunk.isEntry)
if (!entry) {
  console.error('No entry chunk found in the manifest.')
  process.exit(1)
}

const initialJs = new Set()
const initialCss = new Set()
;(function collect(key, seen = new Set()) {
  if (seen.has(key)) return
  seen.add(key)
  const chunk = manifest[key]
  if (!chunk) return
  initialJs.add(chunk.file)
  for (const css of chunk.css ?? []) initialCss.add(css)
  for (const imported of chunk.imports ?? []) collect(imported, seen)
})(Object.keys(manifest).find((key) => manifest[key].isEntry))

const allFiles = walk(DIST)
const stockfish = allFiles.filter((f) => /stockfish/i.test(f))
// Lazy route chunks: application .js outside the initial set. Stockfish is
// excluded — it has its own budget, and it is the engine worker, not a route.
const lazyJs = allFiles.filter(
  (f) => f.endsWith('.js') && !initialJs.has(f) && !/stockfish/i.test(f),
)
const otherCss = allFiles.filter((f) => f.endsWith('.css') && !initialCss.has(f))

const sum = (files) => files.reduce((total, f) => total + gzipKb(f), 0)

const groups = [
  { budget: BUDGETS.initialJs, files: [...initialJs] },
  { budget: BUDGETS.css, files: [...initialCss, ...otherCss] },
  {
    budget: BUDGETS.stockfish,
    files: stockfish.filter((f) => f.endsWith('.js') || f.endsWith('.wasm')),
  },
]

let failed = false
console.log('\nBundle size budget (gzipped sizes)\n')
for (const { budget, files } of groups) {
  if (files.length === 0) continue
  const usedKb = sum(files)
  const over = usedKb > budget.maxGzipKb
  failed ||= over
  const pct = Math.round((usedKb / budget.maxGzipKb) * 100)
  console.log(
    `  ${(over ? 'OVER' : 'OK').padEnd(6)} ${budget.label.padEnd(24)} ` +
      `${usedKb.toFixed(1).padStart(7)} kB / ${String(budget.maxGzipKb).padStart(5)} kB  (${pct}%)`,
  )
}

// The lazy route chunks are informational: they are not downloaded up front.
const lazyKb = sum(lazyJs)
console.log(
  `\n  (info) ${lazyJs.length} lazily loaded route chunk(s), ${lazyKb.toFixed(1)} kB gzipped total, ` +
    'downloaded only when their route is opened.\n',
)

if (failed) {
  console.error('Budget exceeded. Trim the bundle, or raise the budget with a justification.\n')
  process.exit(1)
}
console.log('All budgets are within limits.\n')
