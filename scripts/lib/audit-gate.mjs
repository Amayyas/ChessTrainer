/**
 * The dependency audit CI blocks on: every high or critical advisory fails the
 * build, unless it is one of the exceptions below.
 *
 * `npm audit --audit-level=high` did this until an advisory arrived with no
 * patched release at all. braces <= 3.0.3 (GHSA-vfj7-8cjw-p6xm) has none, and
 * the only way npm offers out of it is Tailwind 4 — a migration, not a fix. With
 * no way to set one advisory aside, every branch stayed red until someone did
 * that migration or switched the gate off. This keeps the gate on and makes
 * each exception explicit, reasoned and temporary.
 *
 * An exception is checked, not trusted: it lapses on its date, so it gets
 * looked at again; and one that no longer matches anything fails too, so the
 * list cannot quietly outlive its reasons and wave through a later advisory.
 */

/**
 * @typedef {{ id: string, package: string, reason: string, until: string }} Exception
 * @typedef {{ id: string, package: string, severity: string, title: string }} Advisory
 */

/** @type {Exception[]} */
export const EXCEPTIONS = [
  {
    id: 'GHSA-vfj7-8cjw-p6xm',
    package: 'braces',
    reason:
      'No patched release exists. braces reaches us only through tailwindcss 3 (chokidar, ' +
      'micromatch), at build time, where the patterns it expands are the content globs in ' +
      'tailwind.config.ts: written in this repository, never supplied by anyone else. The ' +
      'advisory is a stack overflow on deeply nested patterns, so the worst case is a build ' +
      'that crashes. Nothing ships to players. Leaving it needs the Tailwind 4 migration.',
    until: '2027-01-15',
  },
]

const BLOCKING = new Set(['high', 'critical'])

/**
 * The advisories in `npm audit --json` output, one per advisory and package —
 * one advisory can name several packages, and an exception for one of them
 * must not excuse the others. Each
 * vulnerable package lists the advisories against it in `via` as objects, and
 * the packages that merely depend on a vulnerable one as strings; only the
 * objects are advisories.
 *
 * @param {any} report parsed `npm audit --json`
 * @returns {Advisory[]}
 */
export function advisories(report) {
  /** @type {Map<string, Advisory>} */
  const found = new Map()
  for (const vulnerability of Object.values(report?.vulnerabilities ?? {})) {
    for (const via of /** @type {any} */ (vulnerability).via ?? []) {
      if (typeof via !== 'object' || via === null) continue
      const id = /GHSA-[\w-]+/.exec(String(via.url ?? ''))?.[0] ?? String(via.source)
      found.set(`${id} ${via.name}`, {
        id,
        package: via.name,
        severity: via.severity,
        title: via.title,
      })
    }
  }
  return [...found.values()]
}

/**
 * @param {any} report parsed `npm audit --json`
 * @param {Exception[]} exceptions
 * @param {string} today YYYY-MM-DD
 * @returns {{ failures: string[], excused: string[] }}
 */
export function evaluate(report, exceptions, today) {
  if (!report || typeof report.vulnerabilities !== 'object') {
    // A run that produced no report must not read as a clean one.
    return { failures: ['npm audit produced no report'], excused: [] }
  }
  const all = advisories(report)
  const failures = []
  const excused = []

  for (const advisory of all.filter((a) => BLOCKING.has(a.severity))) {
    const exception = exceptions.find((e) => e.id === advisory.id && e.package === advisory.package)
    const line = `${advisory.severity} ${advisory.package} ${advisory.id}: ${advisory.title}`
    if (!exception) failures.push(line)
    else if (exception.until < today) {
      failures.push(`${line} (exception lapsed on ${exception.until}; review it)`)
    } else excused.push(`${line} (excepted until ${exception.until})`)
  }

  for (const exception of exceptions) {
    if (!all.some((a) => a.id === exception.id && a.package === exception.package)) {
      failures.push(`exception for ${exception.package} ${exception.id} matches nothing; remove it`)
    }
  }
  return { failures, excused }
}
