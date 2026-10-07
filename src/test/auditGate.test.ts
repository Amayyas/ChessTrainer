import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EXCEPTIONS, advisories, evaluate } from '../../scripts/lib/audit-gate.mjs'

/**
 * The dependency audit gate CI runs (scripts/audit-gate.mjs).
 *
 * The two reports are real `npm audit --json` output, recorded on 7 October
 * 2026: `before-fix` from main's lockfile, with patched releases available for
 * proxy-addr, compression and source-map-js; `after-fix` once they were taken,
 * leaving braces, which has no patched release.
 */

function report(name: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), `src/test/fixtures/${name}`), 'utf8'))
}

const TODAY = '2026-10-07'

describe('the audit gate', () => {
  it('blocks every high or critical advisory that has no exception', () => {
    const { failures } = evaluate(report('npm-audit-before-fix.json'), EXCEPTIONS, TODAY)
    expect(failures.map((line) => /^\S+ \S+ GHSA-[\w-]+/.exec(line)?.[0]).sort()).toEqual([
      'critical proxy-addr GHSA-jqcg-44mw-7w3h',
      'high compression GHSA-vc2v-76pw-4v95',
      'high source-map-js GHSA-68fv-2mgg-jv7q',
    ])
  })

  it('lets an excepted advisory through, and says so', () => {
    const { failures, excused } = evaluate(report('npm-audit-after-fix.json'), EXCEPTIONS, TODAY)
    expect(failures).toEqual([])
    expect(excused).toHaveLength(1)
    expect(excused[0]).toMatch(
      /^high braces GHSA-vfj7-8cjw-p6xm: .* \(excepted until \d{4}-\d{2}-\d{2}\)$/,
    )
  })

  it('blocks the same advisory once there is no exception for it', () => {
    // The control for the test above: the report itself is not clean.
    const { failures } = evaluate(report('npm-audit-after-fix.json'), [], TODAY)
    expect(failures).toEqual([expect.stringMatching(/^high braces GHSA-vfj7-8cjw-p6xm: /)])
  })

  it('blocks it again once the exception lapses', () => {
    const lapsed = EXCEPTIONS.map((exception) => ({ ...exception, until: '2026-10-06' }))
    const { failures } = evaluate(report('npm-audit-after-fix.json'), lapsed, TODAY)
    expect(failures).toEqual([expect.stringMatching(/exception lapsed on 2026-10-06/)])
  })

  it('fails on an exception that matches nothing, so the list cannot outlive its reasons', () => {
    const stale = [
      ...EXCEPTIONS,
      { id: 'GHSA-0000-0000-0000', package: 'left-pad', reason: 'gone', until: '2099-01-01' },
    ]
    const { failures } = evaluate(report('npm-audit-after-fix.json'), stale, TODAY)
    expect(failures).toEqual([
      expect.stringMatching(/left-pad GHSA-0000-0000-0000 matches nothing/),
    ])
  })

  it('excuses one package without excusing another under the same advisory', () => {
    const shared = { url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc', severity: 'high' }
    const twoPackages = {
      vulnerabilities: {
        excused: { via: [{ ...shared, name: 'excused', title: 't' }] },
        other: { via: [{ ...shared, name: 'other', title: 't' }] },
      },
    }
    const exception = {
      id: 'GHSA-aaaa-bbbb-cccc',
      package: 'excused',
      reason: 'r',
      until: '2099-01-01',
    }
    const { failures, excused } = evaluate(twoPackages, [exception], TODAY)
    expect(excused).toEqual([expect.stringMatching(/^high excused /)])
    expect(failures).toEqual([expect.stringMatching(/^high other /)])
  })

  it('never reads a missing report as a clean one', () => {
    expect(evaluate(null, EXCEPTIONS, TODAY).failures).toEqual(['npm audit produced no report'])
    expect(evaluate({}, EXCEPTIONS, TODAY).failures).toEqual(['npm audit produced no report'])
  })

  it('does not block on moderate advisories', () => {
    // Both reports carry moderate ones (postcss-selector-parser, sprintf-js);
    // they go to Dependabot's weekly PR, as before.
    const moderate = advisories(report('npm-audit-after-fix.json')).filter(
      (advisory) => advisory.severity === 'moderate',
    )
    expect(moderate.length).toBeGreaterThan(0)
    const { failures } = evaluate(report('npm-audit-after-fix.json'), EXCEPTIONS, TODAY)
    expect(failures).toEqual([])
  })

  it('keeps every exception reasoned and dated', () => {
    for (const exception of EXCEPTIONS) {
      expect(exception.reason.length).toBeGreaterThan(80)
      expect(exception.until).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
