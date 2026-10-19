import { describe, expect, it } from 'vitest'
import { formatDecimal, formatPercent, formatSigned } from '@/utils/format'

describe('format', () => {
  it('writes a decimal comma, never a point', () => {
    expect(formatSigned(1.3)).toBe('+1,3')
    expect(formatDecimal(9.5)).toBe('9,5')
    for (const value of [0.1, 2.25, 12.8, -3.4]) {
      expect(formatSigned(value), String(value)).not.toContain('.')
      expect(formatDecimal(value), String(value)).not.toContain('.')
    }
  })

  it('signs with a plus and a true minus', () => {
    expect(formatSigned(2)).toBe('+2,0')
    expect(formatSigned(-0.4)).toBe('\u22120,4')
    expect(formatSigned(-0.4)).not.toContain('-')
  })

  it('leaves zero unsigned, even when a tiny negative rounds to it', () => {
    expect(formatSigned(0)).toBe('0,0')
    expect(formatSigned(-0.04)).toBe('0,0')
    expect(formatSigned(0.04)).toBe('0,0')
  })

  it('keeps the percent sign on the line of its number', () => {
    // A plain space would let the sign wrap onto a line of its own.
    expect(formatPercent(91)).toMatch(/^91[\u00a0\u202f]%$/)
    expect(formatPercent(0)).toMatch(/^0[\u00a0\u202f]%$/)
  })
})
