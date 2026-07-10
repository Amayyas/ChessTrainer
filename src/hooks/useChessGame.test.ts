import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useChessGame } from '@/hooks/useChessGame'

describe('useChessGame', () => {
  it('starts at the initial position with white to move and no history', () => {
    const { result } = renderHook(() => useChessGame())
    expect(result.current.turn).toBe('w')
    expect(result.current.sanHistory).toEqual([])
    expect(result.current.lastMove).toBeNull()
    expect(result.current.status.isOver).toBe(false)
  })

  it('applies a legal move and records it in algebraic notation', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => {
      result.current.move('e2', 'e4')
    })
    expect(result.current.sanHistory).toEqual(['e4'])
    expect(result.current.turn).toBe('b')
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' })
  })

  it('rejects an illegal move without changing state', () => {
    const { result } = renderHook(() => useChessGame())
    let applied: unknown
    act(() => {
      applied = result.current.move('e2', 'e5')
    })
    expect(applied).toBeNull()
    expect(result.current.sanHistory).toEqual([])
    expect(result.current.turn).toBe('w')
  })

  it('lists legal targets for a piece', () => {
    const { result } = renderHook(() => useChessGame())
    expect(result.current.getLegalTargets('e2').sort()).toEqual(['e3', 'e4'])
    expect(result.current.getLegalTargets('e4')).toEqual([])
  })

  it('flags a promotion move and applies the chosen piece', () => {
    // White pawn on a7, black king far away: a7-a8 promotes.
    const { result } = renderHook(() => useChessGame('8/P7/8/8/8/8/8/k6K w - - 0 1'))
    expect(result.current.isPromotion('a7', 'a8')).toBe(true)
    act(() => {
      result.current.move('a7', 'a8', 'q')
    })
    expect(result.current.sanHistory[0]).toBe('a8=Q+')
  })

  it('detects checkmate and names the winner', () => {
    // Fool's mate.
    const { result } = renderHook(() => useChessGame())
    act(() => {
      result.current.move('f2', 'f3')
    })
    act(() => {
      result.current.move('e7', 'e5')
    })
    act(() => {
      result.current.move('g2', 'g4')
    })
    act(() => {
      result.current.move('d8', 'h4')
    })
    expect(result.current.status.isOver).toBe(true)
    expect(result.current.status.reason).toBe('checkmate')
    expect(result.current.status.winner).toBe('b')
  })

  it('reports check and the king square', () => {
    // Rook on e2 slides up the open e-file to e7, checking the king on e8.
    const { result } = renderHook(() => useChessGame('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1'))
    act(() => {
      result.current.move('e2', 'e7')
    })
    expect(result.current.status.isCheck).toBe(true)
    expect(result.current.checkSquare).toBe('e8')
  })

  it('undoes the last move', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => {
      result.current.move('e2', 'e4')
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.sanHistory).toEqual([])
    expect(result.current.turn).toBe('w')
  })

  it('resets to the start position', () => {
    const { result } = renderHook(() => useChessGame())
    act(() => {
      result.current.move('e2', 'e4')
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.sanHistory).toEqual([])
    expect(result.current.turn).toBe('w')
  })
})
