/**
 * Fails on any high or critical dependency advisory that is not one of the
 * reasoned, dated exceptions in scripts/lib/audit-gate.mjs. CI runs it in place
 * of `npm audit --audit-level=high`.
 *
 * Usage: node scripts/audit-gate.mjs
 */
import { spawnSync } from 'node:child_process'
import { EXCEPTIONS, evaluate } from './lib/audit-gate.mjs'

// npm audit exits non-zero whenever it finds anything, so the exit code says
// nothing here; the JSON on stdout is the result.
const run = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
let report = null
try {
  report = JSON.parse(run.stdout)
} catch {
  console.error(run.stderr || 'npm audit printed no JSON')
}

const today = new Date().toISOString().slice(0, 10)
const { failures, excused } = evaluate(report, EXCEPTIONS, today)

for (const line of excused) console.log(`  excused  ${line}`)
for (const line of failures) console.log(`  FAIL     ${line}`)
if (failures.length > 0) {
  console.log(`\n${failures.length} blocking finding(s).`)
  process.exit(1)
}
console.log(`no blocking advisory${excused.length ? ` (${excused.length} excused)` : ''}.`)
