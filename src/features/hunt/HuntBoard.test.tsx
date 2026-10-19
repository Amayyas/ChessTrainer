import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HuntBoard from '@/features/hunt/HuntBoard'

let boardProps: { animationDuration?: number } = {}
vi.mock('react-chessboard', () => ({
  Chessboard: (props: { animationDuration?: number }) => {
    boardProps = props
    return null
  },
}))

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: media === '(prefers-reduced-motion: reduce)' ? reduce : false,
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function renderBoard() {
  render(
    <HuntBoard
      champion="n"
      championSquare="d4"
      enemies={new Map()}
      moves={[]}
      threats={[]}
      onMove={() => {}}
      boardWidth={400}
    />,
  )
}

describe('HuntBoard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('moves its pieces without a glide when the reader asks for less motion', () => {
    // The coach's and the battle's boards honoured the setting; this one slid
    // every move over 120 ms whatever it said.
    stubReducedMotion(true)
    renderBoard()
    expect(boardProps.animationDuration).toBe(0)
  })

  it('glides otherwise', () => {
    stubReducedMotion(false)
    renderBoard()
    expect(boardProps.animationDuration).toBe(120)
  })
})
