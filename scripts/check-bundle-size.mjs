/**
 * Bundle size guard.
 *
 * The specification rates "Stockfish bundle above 5 MB" as a highly probable risk
 * (section 06), with lazy loading of the worker as the mitigation. This script fails
 * if the initial bundle exceeds its budget, so a regression shows up on the PR that
 * introduces it rather than at delivery time.
 *
 * Stockfish files (worker + wasm) are excluded from the initial budget: they are
 * loaded on demand and tracked by their own budget.
 */
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const KB = 1024

/** A file can only count toward the first budget that accepts it. */
const BUDGETS = [
  {
    label: 'Stockfish (loaded on demand)',
    match: (path) => /stockfish/i.test(path),
    maxGzipKb: 5 * KB,
  },
  {
    label: 'Initial JavaScript',
    match: (path) => path.endsWith('.js'),
    maxGzipKb: 200,
  },
  {
    label: 'CSS',
    match: (path) => path.endsWith('.css'),
    maxGzipKb: 50,
  },
]

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

let files
try {
  files = walk(DIST)
} catch {
  console.error(`No build found in ${DIST}. Run "npm run build" first.`)
  process.exit(1)
}

const totals = new Map(BUDGETS.map((budget) => [budget.label, { budget, gzipBytes: 0, files: 0 }]))

for (const file of files) {
  const path = relative(DIST, file)
  const budget = BUDGETS.find((candidate) => candidate.match(path))
  if (!budget) continue

  const entry = totals.get(budget.label)
  entry.gzipBytes += gzipSync(readFileSync(file)).length
  entry.files += 1
}

let failed = false
console.log('\nBundle size budget (gzipped sizes)\n')

for (const { budget, gzipBytes, files: count } of totals.values()) {
  if (count === 0) continue

  const usedKb = gzipBytes / KB
  const pct = Math.round((usedKb / budget.maxGzipKb) * 100)
  const over = usedKb > budget.maxGzipKb
  failed ||= over

  const status = over ? 'OVER' : 'OK'
  console.log(
    `  ${status.padEnd(6)} ${budget.label.padEnd(30)} ` +
      `${usedKb.toFixed(1).padStart(7)} kB / ${String(budget.maxGzipKb).padStart(5)} kB  (${pct}%)`,
  )
}

if (failed) {
  console.error('\nBudget exceeded. Trim the bundle, or raise the budget with a justification.\n')
  process.exit(1)
}

console.log('\nAll budgets are within limits.\n')
