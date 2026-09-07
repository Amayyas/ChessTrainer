import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every environment variable the code reads must be in `.env.example`.
 *
 * A `VITE_` var added to a component but not documented is invisible until
 * someone clones the repo, copies the example, and finds a feature quietly
 * off — the same shape as the stale-copy bugs this project keeps hitting.
 * This scans the source for env reads and checks each one is listed, active or
 * commented.
 */

const ROOT = resolve(process.cwd())
const ENV_EXAMPLE = join(ROOT, '.env.example')

/** Provided by Vite itself, never declared in .env. */
const VITE_BUILTINS = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL', 'LEGACY'])

/** `import.meta.env.X`, `process.env.X`, and vite.config's `loadEnv` result `env.X`. */
const ENV_READ = /(?:import\.meta\.env|process\.env|(?<![.\w])env)\.([A-Z][A-Z0-9_]+)/g

function sourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (
        /\.(ts|tsx|mjs)$/.test(entry) &&
        !/\.(test|spec)\.[tj]sx?$/.test(entry) &&
        !entry.endsWith('.d.ts')
      ) {
        out.push(full)
      }
    }
  }
  walk(join(ROOT, 'src'))
  walk(join(ROOT, 'scripts'))
  out.push(join(ROOT, 'vite.config.ts'))
  return out
}

function envVarsReadByCode(): Map<string, string> {
  const found = new Map<string, string>()
  for (const file of sourceFiles()) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(ENV_READ)) {
      const name = match[1]!
      if (!VITE_BUILTINS.has(name) && !found.has(name)) {
        found.set(name, file.replace(`${ROOT}/`, ''))
      }
    }
  }
  return found
}

function documentedVars(): Set<string> {
  const text = readFileSync(ENV_EXAMPLE, 'utf8')
  return new Set([...text.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)\s*=/gm)].map((m) => m[1]!))
}

describe('.env.example', () => {
  const read = envVarsReadByCode()
  const documented = documentedVars()

  it('parses a plausible set from both sides', () => {
    // Guards the guard: a broken scan would make the check below vacuous.
    expect(read.size).toBeGreaterThanOrEqual(4)
    expect(documented.size).toBeGreaterThanOrEqual(4)
  })

  it('documents every env var the code reads', () => {
    const undocumented = [...read.entries()]
      .filter(([name]) => !documented.has(name))
      .map(([name, file]) => `${name} (read in ${file})`)
    expect(undocumented).toEqual([])
  })
})
