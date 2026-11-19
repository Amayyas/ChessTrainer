import type { CSSProperties } from 'react'
import { board, diagram, durations, newsprint } from '@/lib/design-tokens'

/** The dark squares hatched in ink, as a printed diagram has them, or plain grey. */
export type SquaresVariant = 'hatched' | 'plain'

/** Which edition's diagram the squares are drawn for. */
export type Edition = 'day' | 'night'

/**
 * The 64 squares as one SVG, drawn from the board tokens rather than kept as a
 * file, so a change of paper or ink reaches the board too. a8, the top left
 * corner, is a light square; the picture is the same turned round, so it
 * serves both orientations. The evening edition dims the paper and keeps the
 * ink, so the diagram does not glare out of a dark page.
 */
export function squaresSvg(variant: SquaresVariant, edition: Edition = 'day'): string {
  const { period, stripe } = board.hatch
  const { light, ink: colour, plain } = diagram[edition]
  const dark = variant === 'plain' ? plain : 'url(#hatch)'
  const pattern =
    variant === 'hatched'
      ? `<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="${period}" height="${period}" patternTransform="rotate(45)">` +
        `<rect width="${period}" height="${period}" fill="${light}"/>` +
        `<rect width="${stripe}" height="${period}" fill="${colour}"/></pattern></defs>`
      : ''
  let squares = ''
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      if ((row + column) % 2 === 1) {
        squares += `<rect x="${column * 100}" y="${row * 100}" width="100" height="100" fill="${dark}"/>`
      }
    }
  }
  const crisp = variant === 'plain' ? ' shape-rendering="crispEdges"' : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"${crisp}>${pattern}` +
    `<rect width="800" height="800" fill="${light}"/>${squares}</svg>`
  )
}

const asImage = (variant: SquaresVariant, edition: Edition) =>
  `url("data:image/svg+xml,${encodeURIComponent(squaresSvg(variant, edition))}")`

const SQUARES: Record<SquaresVariant, Record<Edition, string>> = {
  hatched: { day: asImage('hatched', 'day'), night: asImage('hatched', 'night') },
  plain: { day: asImage('plain', 'day'), night: asImage('plain', 'night') },
}

/**
 * The board's colours and timings as custom properties on its frame, for
 * board.css to read: the stylesheet holds the shapes, the tokens the values.
 * Both editions' squares are handed over, and board.css picks the one the page
 * is in — an image cannot read a custom property, so the swap happens there.
 */
export function boardStyle(variant: SquaresVariant, reduceMotion: boolean): CSSProperties {
  return {
    '--board-squares-day': SQUARES[variant].day,
    '--board-squares-night': SQUARES[variant].night,
    '--board-ink': newsprint.ink.DEFAULT,
    '--board-rubric': newsprint.rubric,
    '--board-last-move': board.lastMove,
    '--board-check': board.check,
    '--board-destination': board.destination,
    '--board-arrow-in': reduceMotion ? '0ms' : `${durations.arrow}ms`,
  } as CSSProperties
}
