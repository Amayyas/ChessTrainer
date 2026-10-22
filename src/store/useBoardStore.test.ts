import { beforeEach, describe, expect, it } from 'vitest'
import { useBoardStore } from '@/store/useBoardStore'

const KEY = 'chesstrainer.board'

beforeEach(() => {
  localStorage.clear()
  useBoardStore.setState({ squares: 'hatched' })
})

describe('useBoardStore', () => {
  it('starts hatched, as a printed diagram is', () => {
    expect(useBoardStore.getInitialState().squares).toBe('hatched')
  })

  it('keeps the choice on the device, under a versioned key', () => {
    useBoardStore.getState().setSquares('plain')
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      state: { squares: 'plain' },
      version: 1,
    })
  })

  it('reads the choice back when the page loads again', async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { squares: 'plain' }, version: 1 }))
    await useBoardStore.persist.rehydrate()
    expect(useBoardStore.getState().squares).toBe('plain')
  })

  it('falls back to the hatching for a value it does not know', async () => {
    useBoardStore.setState({ squares: 'plain' })
    localStorage.setItem(KEY, JSON.stringify({ state: { squares: 'checkered' }, version: 1 }))
    await useBoardStore.persist.rehydrate()
    expect(useBoardStore.getState().squares).toBe('hatched')
  })
})
