import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  classifyMove,
  MOVE_QUALITY,
  MOVE_QUALITY_ORDER,
  type MoveQuality,
} from '@/utils/evaluation'

/**
 * docs/move-grading.md prints the grade thresholds as a table, and prose that
 * restates data drifts from it: the home page advertised five levels for two
 * releases after the ladder had six. This reads the table back and holds each
 * row to `classifyMove`, so a threshold changed in the code fails here until
 * the page is changed with it.
 */

const DOC = readFileSync(resolve(process.cwd(), 'docs', 'move-grading.md'), 'utf-8').replace(
  /\r\n/g,
  '\n',
)

interface Row {
  symbol: string
  label: string
  loss: string
}

const SECTION = DOC.split('\n## The grades\n')[1]?.split('\n## ')[0] ?? ''

function gradeTable(): Row[] {
  return [...SECTION.matchAll(/^\| *(\S+) *\| *([^|]+?) *\| *([^|]+?) *\|$/gm)]
    .map(([, symbol, label, loss]) => ({ symbol: symbol!, label: label!, loss: loss! }))
    .filter((row) => row.symbol !== 'Sign' && !/^-+$/.test(row.symbol))
}

function tierOf(row: Row): MoveQuality {
  const tier = MOVE_QUALITY_ORDER.find((id) => MOVE_QUALITY[id].label === row.label)
  if (!tier) throw new Error(`docs/move-grading.md names a grade the code does not: ${row.label}`)
  return tier
}

describe('docs/move-grading.md', () => {
  const rows = gradeTable()

  it('lists every grade once, strongest first, under its sign', () => {
    // A renamed heading would otherwise read as every grade gone from the table.
    expect(SECTION, 'docs/move-grading.md has no "## The grades" section').not.toBe('')
    expect(rows.map(tierOf)).toEqual([...MOVE_QUALITY_ORDER])
    for (const row of rows) expect(row.symbol).toBe(MOVE_QUALITY[tierOf(row)].symbol)
  })

  it('states the threshold classifyMove applies to each graded tier', () => {
    const bounded = rows.filter((row) => row.loss.startsWith('up to '))
    // Every tier between ★ and the open-ended last one, so a row whose wording
    // drifted cannot drop out of the check unnoticed.
    expect(bounded).toHaveLength(MOVE_QUALITY_ORDER.length - 2)

    for (const row of bounded) {
      const limit = Number(row.loss.replace('up to ', ''))
      expect(classifyMove(limit), `${row.label} at ${limit}`).toBe(tierOf(row))
      expect(classifyMove(limit + 1), `${row.label} past ${limit}`).not.toBe(tierOf(row))
    }

    const last = rows.at(-1)!
    const floor = Number(/^more than (\d+)$/.exec(last.loss)?.[1])
    expect(classifyMove(floor), `${last.label} at ${floor}`).not.toBe(tierOf(last))
    expect(classifyMove(floor + 1), `${last.label} past ${floor}`).toBe(tierOf(last))
  })

  it('keeps ★ for the engine’s own move, which no loss earns', () => {
    const best = rows[0]!
    expect(best.loss).toBe("the engine's own move")
    expect(classifyMove(0)).not.toBe(tierOf(best))
  })
})
