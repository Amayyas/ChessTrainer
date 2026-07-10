/**
 * Garde-fou de taille de bundle.
 *
 * Le cahier des charges classe "Taille bundle Stockfish > 5 Mo" comme un risque de
 * probabilite HAUTE (section 06), avec pour mitigation le lazy loading du worker.
 * Ce script echoue si le bundle initial depasse son budget : la regression devient
 * visible sur la PR qui l'introduit, et non a la livraison.
 *
 * Les fichiers Stockfish (worker + wasm) sont exclus du budget initial : ils sont
 * charges a la demande et suivis par leur propre budget.
 */
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const KB = 1024

/** Un fichier ne peut compter que dans le premier budget qui l'accepte. */
const BUDGETS = [
  {
    label: 'Stockfish (charge a la demande)',
    match: (path) => /stockfish/i.test(path),
    maxGzipKb: 5 * KB,
  },
  {
    label: 'JavaScript initial',
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
  console.error(`Aucun build trouve dans ${DIST}. Lancez "npm run build" d'abord.`)
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
console.log('\nBudget de taille de bundle (tailles gzippees)\n')

for (const { budget, gzipBytes, files: count } of totals.values()) {
  if (count === 0) continue

  const usedKb = gzipBytes / KB
  const pct = Math.round((usedKb / budget.maxGzipKb) * 100)
  const over = usedKb > budget.maxGzipKb
  failed ||= over

  const status = over ? 'DEPASSE' : 'OK'
  console.log(
    `  ${status.padEnd(8)} ${budget.label.padEnd(34)} ` +
      `${usedKb.toFixed(1).padStart(7)} kB / ${String(budget.maxGzipKb).padStart(5)} kB  (${pct}%)`,
  )
}

if (failed) {
  console.error('\nBudget depasse. Reduisez le bundle, ou ajustez le budget en le justifiant.\n')
  process.exit(1)
}

console.log('\nTous les budgets sont respectes.\n')
