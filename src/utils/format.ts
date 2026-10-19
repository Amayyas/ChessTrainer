/**
 * Numbers as a French page sets them: a decimal comma (+1,3, not +1.3), a
 * no-break space before the percent sign (91 %, which never wraps away from
 * its number), and a true minus sign (−0,4) rather than the hyphen a keyboard
 * types, as print does.
 */

const MINUS = '\u2212'

const oneDecimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const wholePercent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 })

/**
 * A signed value to one decimal: `+1,3`, `−0,4`. A value that rounds to zero
 * is `0,0`, with no sign, rather than the `−0,0` a tiny negative would give.
 */
export function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) return oneDecimal.format(0)
  return `${rounded > 0 ? '+' : MINUS}${oneDecimal.format(Math.abs(rounded))}`
}

/** A value to one decimal, as given: `9,5`. Rounding is the caller's choice. */
export function formatDecimal(value: number): string {
  return oneDecimal.format(value)
}

/** A whole percentage, from 0–100: `91 %`. */
export function formatPercent(value: number): string {
  return wholePercent.format(value / 100)
}
