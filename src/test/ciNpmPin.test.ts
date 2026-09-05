import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every CI job that installs must pin npm first.
 *
 * The versions of npm that Node 22 and Node 24 bundle disagree about whether an
 * optional peer dependency belongs in the lockfile, so an unpinned job tests
 * the installer as much as the code, and reports the disagreement as a missing
 * dependency. The workflow settles this by installing npm from NPM_VERSION
 * before `npm ci` — but nothing stops the next job from being written without
 * that step, and the failure would land on a Dependabot pull request weeks
 * later rather than on the commit that caused it.
 *
 * Read as text rather than parsed: the repository has no YAML parser among its
 * dependencies, and adding one to check five lines is a worse trade than the
 * indentation assumptions below.
 */

const WORKFLOW = resolve(process.cwd(), '.github/workflows/ci.yml')

const INSTALLS = /npm ci\b/
const PINS = /npm i -g npm@/

/** A job header: two spaces, a name, a colon, nothing else on the line. */
const JOB_HEADER = /^ {2}([A-Za-z][\w-]*):$/

interface Job {
  id: string
  body: string
}

/**
 * Split the `jobs:` mapping into one entry per job, by indentation. Anything
 * above `jobs:` — the triggers, the permissions, the workflow-level env — is
 * not a job and is dropped.
 */
export function splitJobs(workflow: string): Job[] {
  const lines = workflow.split('\n')
  const start = lines.findIndex((line) => line === 'jobs:')
  const jobs: Job[] = []
  let current: Job | undefined

  for (const line of lines.slice(start + 1)) {
    const id = JOB_HEADER.exec(line)?.[1]
    if (id !== undefined) {
      current = { id, body: '' }
      jobs.push(current)
    } else if (current !== undefined) {
      current.body += `${line}\n`
    }
  }
  return jobs
}

describe('CI installs with a pinned npm', () => {
  const workflow = readFileSync(WORKFLOW, 'utf8')
  const jobs = splitJobs(workflow)

  // Guards the guard: a split that returned nothing, or that stopped finding
  // job headers, would report every job below as compliant.
  it('finds the jobs in the workflow', () => {
    expect(jobs.map((job) => job.id)).toEqual([
      'quality',
      'quality-matrix',
      'test',
      'policies',
      'db-types',
      'build',
      'lighthouse',
    ])
  })

  it('declares the npm version once, at the top', () => {
    // A version repeated per job is a version that drifts per job.
    expect(workflow).toMatch(/^env:\n {2}NPM_VERSION: '\d+'$/m)
    expect(workflow.match(/npm i -g npm@\$\{\{ env\.NPM_VERSION \}\}/g)).toHaveLength(
      jobs.filter((job) => INSTALLS.test(job.body)).length,
    )
  })

  it('pins npm before every npm ci', () => {
    const unpinned = jobs
      .filter((job) => INSTALLS.test(job.body))
      .filter((job) => {
        const pin = job.body.search(PINS)
        // Pinning after the install would leave `npm ci` running on whatever
        // npm the job's Node shipped, which is the whole defect.
        return pin === -1 || pin > job.body.search(INSTALLS)
      })
      .map((job) => job.id)

    expect(unpinned).toEqual([])
  })

  it('checks at least the jobs that exist today', () => {
    // If `npm ci` is ever renamed or moved, the filter above quietly matches
    // nothing and the previous check passes on an empty list.
    expect(jobs.filter((job) => INSTALLS.test(job.body)).map((job) => job.id)).toEqual([
      'quality',
      'test',
      'policies',
      'build',
      'lighthouse',
    ])
  })
})
