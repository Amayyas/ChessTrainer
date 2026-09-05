import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bestPerPlayer,
  periodStart,
  useLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardPiece,
  type LeaderboardRow,
} from '@/features/leaderboard/useLeaderboard'

const channelName = vi.fn()
const removeChannel = vi.fn()
const fromCalls = vi.fn()

/** A query builder that is chainable and awaitable, resolving to no rows. */
function fakeQuery() {
  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
    eq: () => query,
    gte: () => query,
    then: (onResolved: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onResolved),
  }
  return query
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      fromCalls(table)
      return fakeQuery()
    },
    channel: (name: string) => {
      channelName(name)
      const channel = { on: () => channel, subscribe: () => channel }
      return channel
    },
    removeChannel: (...args: unknown[]) => removeChannel(...args),
  },
}))

const row = (id: number, userId: string, score: number, captures = 0): LeaderboardRow => ({
  id,
  userId,
  username: userId,
  avatarPiece: 'n',
  piece: 'q',
  score,
  captures,
  playedAt: '2026-07-11T10:00:00.000Z',
})

describe('periodStart', () => {
  const now = new Date('2026-07-11T15:30:00')

  it('has no lower bound for all time', () => {
    expect(periodStart('all', now)).toBeNull()
  })

  it('starts today at midnight', () => {
    const start = new Date(periodStart('today', now)!)
    expect(start.getDate()).toBe(11)
    expect(start.getHours()).toBe(0)
  })

  it('covers the last seven days for the week', () => {
    const start = new Date(periodStart('week', now)!)
    expect(start.getDate()).toBe(5)
    expect(start.getHours()).toBe(0)
  })
})

describe('bestPerPlayer', () => {
  it('keeps only each player’s best round', () => {
    const rows = bestPerPlayer([row(1, 'alice', 100), row(2, 'alice', 300), row(3, 'bob', 200)])
    expect(rows.map((r) => r.userId)).toEqual(['alice', 'bob'])
    expect(rows[0]!.score).toBe(300)
  })

  it('sorts by score, then by captures', () => {
    const rows = bestPerPlayer([row(1, 'a', 100, 2), row(2, 'b', 100, 9), row(3, 'c', 150)])
    expect(rows.map((r) => r.userId)).toEqual(['c', 'b', 'a'])
  })

  it('caps the table at the top ten', () => {
    const many = Array.from({ length: 25 }, (_, i) => row(i, `p${i}`, i * 10))
    expect(bestPerPlayer(many)).toHaveLength(10)
  })
})

describe('useLeaderboard realtime subscription', () => {
  beforeEach(() => {
    channelName.mockClear()
    removeChannel.mockClear()
    fromCalls.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('holds one channel across filter changes, and still reloads on each', async () => {
    const { rerender } = renderHook(
      ({ piece, period }: { piece: LeaderboardPiece; period: LeaderboardPeriod }) =>
        useLeaderboard(piece, period),
      { initialProps: { piece: 'all', period: 'all' } },
    )

    await waitFor(() => expect(channelName).toHaveBeenCalledTimes(1))
    const queriesAfterMount = fromCalls.mock.calls.length

    rerender({ piece: 'q', period: 'today' })
    rerender({ piece: 'r', period: 'week' })
    await waitFor(() => expect(fromCalls.mock.calls.length).toBeGreaterThan(queriesAfterMount))

    // The board still refetched for the new filters...
    expect(fromCalls.mock.calls.length).toBeGreaterThanOrEqual(queriesAfterMount + 2)
    // ...but the websocket was never resubscribed.
    expect(channelName).toHaveBeenCalledTimes(1)
    expect(removeChannel).not.toHaveBeenCalled()
  })

  it('removes the channel on unmount', async () => {
    const { unmount } = renderHook(() => useLeaderboard('all', 'all'))
    await waitFor(() => expect(channelName).toHaveBeenCalledTimes(1))
    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(1)
  })
})
