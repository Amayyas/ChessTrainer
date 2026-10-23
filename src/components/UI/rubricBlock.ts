/**
 * The rubric as a solid block, the mark for what needs acting on now, in the
 * two places it is set. Kept here so a tag, a status line and an alert cannot
 * drift into three reds.
 *
 * `RUBRIC_INLINE` sits in a line of capitals — a tag, the battle's status — and
 * bleeds into its margin instead of adding to its height, so a state that turns
 * into an alert moves nothing around it. `RUBRIC_ALERT` is a paragraph of its
 * own: a link inside keeps the block's paper under the pointer and thickens its
 * underline instead, whatever its own classes say, because an inline link turns
 * to the rubric, which here is the ground.
 */
export const RUBRIC_INLINE = '-my-1 bg-rubric px-1.5 py-1 text-paper-bright'

export const RUBRIC_ALERT =
  'bg-rubric px-3 py-2 text-caption text-paper-bright [&_a:hover]:text-paper-bright [&_a:hover]:decoration-2'
