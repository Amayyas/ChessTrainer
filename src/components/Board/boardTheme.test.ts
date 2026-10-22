import { describe, expect, it } from 'vitest'
import { boardStyle, squaresSvg } from '@/components/Board/boardTheme'
import { board, durations } from '@/lib/design-tokens'

/** The fill of every square drawn over the light ground, in reading order. */
function darkSquares(svg: string): Array<{ x: number; y: number; fill: string }> {
  return [
    ...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="100" height="100" fill="([^"]+)"/g),
  ].map(([, x, y, fill]) => ({ x: Number(x), y: Number(y), fill: fill! }))
}

describe('the board’s squares', () => {
  it('draws thirty-two dark squares, a8 light, as a board has them', () => {
    const squares = darkSquares(squaresSvg('hatched'))
    expect(squares).toHaveLength(32)
    // a8 is the top-left corner, light; b8 beside it and a7 below are dark.
    expect(squares).not.toContainEqual(expect.objectContaining({ x: 0, y: 0 }))
    expect(squares).toContainEqual(expect.objectContaining({ x: 100, y: 0 }))
    expect(squares).toContainEqual(expect.objectContaining({ x: 0, y: 100 }))
  })

  it('hatches the dark squares in the tokens’ ink, over the light paper', () => {
    const svg = squaresSvg('hatched')
    expect(new Set(darkSquares(svg).map(({ fill }) => fill))).toEqual(new Set(['url(#hatch)']))
    expect(svg).toContain(`fill="${board.hatch.colour}"`)
    expect(svg).toContain(`width="${board.hatch.stripe}"`)
    expect(svg).toContain(`<rect width="800" height="800" fill="${board.light}"/>`)
  })

  it('fills them with the diagram grey in the plain variant', () => {
    const svg = squaresSvg('plain')
    expect(new Set(darkSquares(svg).map(({ fill }) => fill))).toEqual(new Set([board.plain]))
    expect(svg).not.toContain('pattern')
  })

  it('hands the stylesheet the tokens’ colours, and no arrow fade under reduced motion', () => {
    const style = boardStyle('hatched', false) as Record<string, string>
    expect(style['--board-last-move']).toBe(board.lastMove)
    expect(style['--board-check']).toBe(board.check)
    expect(style['--board-arrow-in']).toBe(`${durations.arrow}ms`)
    expect((boardStyle('hatched', true) as Record<string, string>)['--board-arrow-in']).toBe('0ms')
  })
})
