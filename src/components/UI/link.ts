/**
 * A link set in running text: its words underlined, turning to the rubric
 * under the pointer. `INLINE_LINK` is in semibold, for a link that stands in a
 * sentence; `INLINE_LINK_PLAIN` keeps the text's weight, for an aside's word
 * or a line of its own under a form. Inside an Alert, whose ground is the
 * rubric, the Alert keeps the link readable.
 */
export const INLINE_LINK_PLAIN = 'underline underline-offset-4 transition-colors hover:text-rubric'

export const INLINE_LINK = `font-semibold ${INLINE_LINK_PLAIN}`
