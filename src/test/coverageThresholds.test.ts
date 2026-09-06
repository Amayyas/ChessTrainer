import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Coverage is measured in CI (`test:coverage`) and, since it now carries a
 * floor, a run that drops below it fails. The usual way that floor stops
 * working is not a subtle drift but a deletion — someone hits a red coverage
 * run and "fixes" it by removing the threshold. This asserts the block is
 * still there and still meaningful.
 *
 * It does not restate the numbers: the real check is Vitest comparing them to
 * an actual run. This only guards the config against being gutted.
 */

const CONFIG = resolve(process.cwd(), 'vite.config.ts')

describe('coverage thresholds', () => {
  const config = readFileSync(CONFIG, 'utf8')
  const block = /thresholds: \{([^}]+)\}/.exec(config)?.[1] ?? ''

  it('sets a floor on every v8 metric', () => {
    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
      const raw = new RegExp(`${metric}: (\\d+)`).exec(block)?.[1]
      expect(raw, `${metric} threshold is missing`).toBeDefined()
      const value = Number(raw)
      // Low enough to gut the check, or so high it can only ever be red — both
      // are ways of turning the floor off.
      expect(value, metric).toBeGreaterThanOrEqual(50)
      expect(value, metric).toBeLessThanOrEqual(95)
    }
  })
})
