import type { CSSProperties } from 'react'
import { board, durations, newsprint } from '@/lib/design-tokens'

/** The dark squares hatched in ink, as a printed diagram has them, or plain grey. */
export type SquaresVariant = 'hatched' | 'plain'

/**
 * The 64 squares as one SVG, drawn from the board tokens rather than kept as a
 * file, so a change of paper or ink reaches the board too. a8, the top left
 * corner, is a light square; the picture is the same turned round, so it
 * serves both orientations.
 */
export function squaresSvg(variant: SquaresVariant): string {
  const { period, stripe, colour } = board.hatch
  const dark = variant === 'plain' ? board.plain : 'url(#hatch)'
  const pattern =
    variant === 'hatched'
      ? `<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="${period}" height="${period}" patternTransform="rotate(45)">` +
        `<rect width="${period}" height="${period}" fill="${board.light}"/>` +
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
    `<rect width="800" height="800" fill="${board.light}"/>${squares}</svg>`
  )
}

const SQUARES: Record<SquaresVariant, string> = {
  hatched: `url("data:image/svg+xml,${encodeURIComponent(squaresSvg('hatched'))}")`,
  plain: `url("data:image/svg+xml,${encodeURIComponent(squaresSvg('plain'))}")`,
}

/**
 * The board's colours and timings as custom properties on its frame, for
 * board.css to read: the stylesheet holds the shapes, the tokens the values.
 */
export function boardStyle(variant: SquaresVariant, reduceMotion: boolean): CSSProperties {
  return {
    '--board-squares': SQUARES[variant],
    '--board-ink': newsprint.ink.DEFAULT,
    '--board-rubric': newsprint.rubric,
    '--board-last-move': board.lastMove,
    '--board-check': board.check,
    '--board-destination': board.destination,
    '--board-arrow-in': reduceMotion ? '0ms' : `${durations.arrow}ms`,
  } as CSSProperties
}
