import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Two guards against a class of bug only macOS and Windows can see.
 *
 * CI runs on Linux, where the filesystem is case-sensitive: every import
 * resolves to the file it names, so nothing here can fail there by accident.
 * On a case-insensitive filesystem the same tree resolves differently, and
 * `npm run typecheck` fails on a developer's machine for a defect that passed
 * every check on the way in. That asymmetry is the whole reason these run.
 */

// Vitest runs with the project root as its working directory; import.meta.url
// is not a file: URL under the jsdom environment, so it cannot anchor this.
const SRC = resolve(process.cwd(), 'src')

/**
 * The extensions a bare module specifier can pick up, in the order TypeScript
 * and Vite try them. The order is what makes the second check bite: `.ts` is
 * tried before `.tsx`, so `import './Widget'` next to a `widget.ts` reaches the
 * lowercase module and never sees `Widget.tsx`.
 */
const RESOLVED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']

interface SourceFile {
  /** Path relative to src/, with forward slashes, e.g. `features/profile/ProfilePage.tsx`. */
  path: string
  /** Directory part, `''` for a file sitting directly in src/. */
  dir: string
  name: string
}

function collect(dir = '', found: SourceFile[] = []): SourceFile[] {
  for (const entry of readdirSync(join(SRC, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}${entry.name}` : entry.name
    if (entry.isDirectory()) {
      collect(`${path}/`, found)
    } else {
      found.push({ path, dir, name: entry.name })
    }
  }
  return found
}

/**
 * Group by a lowercased key, keeping only the keys that more than one file
 * produced. Returns the original paths, since the casing is the evidence.
 */
function collisions(files: SourceFile[], key: (file: SourceFile) => string): string[][] {
  const byKey = new Map<string, string[]>()
  for (const file of files) {
    const lower = key(file).toLowerCase()
    byKey.set(lower, [...(byKey.get(lower) ?? []), file.path])
  }
  return [...byKey.values()].filter((paths) => paths.length > 1).map((paths) => [...paths].sort())
}

function stripExtension(name: string): string {
  const extension = RESOLVED_EXTENSIONS.find((candidate) => name.endsWith(candidate))
  return extension ? name.slice(0, -extension.length) : name
}

describe('filename casing across src/', () => {
  const files = collect()

  // Guards the guard: a walk that silently found nothing would pass both
  // checks below and prove nothing at all.
  it('walks the tree it is meant to check', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.map((file) => file.path)).toContain('test/filenameCasing.test.ts')
  })

  it('has no two files whose full names differ only in casing', () => {
    // These cannot coexist on a case-insensitive filesystem at all: a checkout
    // gets one file and a permanently dirty worktree. Only Linux can hold both,
    // so only Linux can detect the pair — which is where this test runs in CI.
    expect(collisions(files, (file) => file.path)).toEqual([])
  })

  it('has no two modules in a directory whose names differ only in casing', () => {
    // The real hazard, and the one a full-name comparison misses:
    // `accuracyHistory.ts` and `AccuracyHistory.tsx` are distinct names even
    // case-insensitively, because the extensions differ. They still collapse to
    // one module specifier, and `import '…/AccuracyHistory'` resolved to the
    // lowercase utility module instead of the component.
    const modules = files.filter((file) =>
      RESOLVED_EXTENSIONS.some((extension) => file.name.endsWith(extension)),
    )
    expect(collisions(modules, (file) => `${file.dir}${stripExtension(file.name)}`)).toEqual([])
  })
})

/**
 * The two checks above are only as good as this comparison, and one of them
 * cannot be made to fail on the machine that needs it most: a case-insensitive
 * filesystem will not hold `Widget.tsx` and `widget.tsx` at once, so there is no
 * way to stage a real collision here and watch it go red. These feed the
 * comparison a tree it cannot build on disk, so the detection is proven
 * wherever the suite runs rather than only on Linux.
 */
describe('collisions', () => {
  const file = (path: string): SourceFile => {
    const cut = path.lastIndexOf('/')
    return { path, dir: cut === -1 ? '' : path.slice(0, cut + 1), name: path.slice(cut + 1) }
  }

  it('reports names that differ only in casing', () => {
    const found = collisions(['a/Widget.tsx', 'a/widget.tsx'].map(file), (entry) => entry.path)
    expect(found).toEqual([['a/Widget.tsx', 'a/widget.tsx']])
  })

  it('reports a module specifier reachable by two files', () => {
    const found = collisions(
      ['a/accuracyHistory.ts', 'a/AccuracyHistory.tsx'].map(file),
      (entry) => `${entry.dir}${stripExtension(entry.name)}`,
    )
    expect(found).toEqual([['a/AccuracyHistory.tsx', 'a/accuracyHistory.ts']])
  })

  it('leaves same-name files in different directories alone', () => {
    expect(collisions(['a/index.ts', 'b/index.ts'].map(file), (entry) => entry.path)).toEqual([])
  })

  it('leaves a module and its test alone', () => {
    // `levels.ts` and `levels.test.ts` share a prefix, not a specifier: nothing
    // resolves `./levels` to the test file.
    const found = collisions(
      ['a/levels.ts', 'a/levels.test.ts'].map(file),
      (entry) => `${entry.dir}${stripExtension(entry.name)}`,
    )
    expect(found).toEqual([])
  })
})
