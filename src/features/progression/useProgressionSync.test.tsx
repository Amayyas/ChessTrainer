import { render } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { snapshotToRow } from '@/features/progression/sync'
import { useProgressionSync } from '@/features/progression/useProgressionSync'
import { useAuthStore } from '@/store/useAuthStore'
import { type ProgressionSnapshot, useProgressionStore } from '@/store/useProgressionStore'

type QueryResult = { data: unknown; error: { message: string } | null }

// The network half talks to a fake client. `pull` answers the read of the
// account's row and `upsert` the write; each test decides what they return.
// `client` is swapped per suite: the ownership tests run with no backend at all,
// so only the decision that once wiped progress is exercised there.
const net = vi.hoisted(() => {
  const pull = vi.fn<(userId: unknown) => Promise<QueryResult>>()
  const upsert = vi.fn<(row: unknown, options: unknown) => Promise<QueryResult>>()
  const fake = {
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    from: (table: string) => {
      if (table !== 'progression') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: (_column: string, value: unknown) => ({ maybeSingle: () => pull(value) }),
        }),
        upsert: (row: unknown, options: unknown) => upsert(row, options),
      }
    },
  }
  return { pull, upsert, fake, client: null as typeof fake | null }
})

vi.mock('@/lib/supabase', async () => ({
  ...(await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')),
  get supabase() {
    return net.client
  },
  isSupabaseConfigured: true,
}))

const player = { user: { id: 'player-1' } } as unknown as Session
const other = { user: { id: 'player-2' } } as unknown as Session

function Harness() {
  useProgressionSync()
  return null
}

/** The state that only ever lives on this device, and that the server cannot restore. */
function localOnly() {
  const { daily, activities } = useProgressionStore.getState()
  return { huntScore: daily.huntScore, activities: activities.length }
}

describe('useProgressionSync — ownership', () => {
  beforeEach(() => {
    net.client = null
    useProgressionStore.getState().reset()
    useAuthStore.setState({ isReady: true, session: player, departures: 0 })
  })

  it('keeps the day of a signed-in player across a re-render', () => {
    render(<Harness />)
    act(() => {
      useProgressionStore.getState().recordHunt({ score: 890, captures: 12, championLabel: 'Dame' })
    })
    expect(localOnly()).toEqual({ huntScore: 890, activities: 1 })

    render(<Harness />)
    expect(localOnly()).toEqual({ huntScore: 890, activities: 1 })
  })

  it('survives a session that momentarily reports nothing', () => {
    // The bug this covers. Supabase re-emits auth state around a token refresh
    // and can report no session in between. That was read as a sign-out, which
    // wiped everything — and the server copy then restored the synced fields,
    // hiding the loss everywhere except the day's challenges and the feed.
    render(<Harness />)
    act(() => {
      useProgressionStore.getState().recordHunt({ score: 890, captures: 12, championLabel: 'Dame' })
    })

    act(() => useAuthStore.setState({ session: null }))
    act(() => useAuthStore.setState({ session: player }))

    expect(localOnly()).toEqual({ huntScore: 890, activities: 1 })
  })

  it('still clears everything when the player actually signs out', () => {
    // The blip above must not be bought at the price of the leak this prevents:
    // the next person on this browser must not inherit the last one's progress.
    render(<Harness />)
    act(() => {
      useProgressionStore.getState().recordHunt({ score: 890, captures: 12, championLabel: 'Dame' })
    })

    act(() => useAuthStore.setState({ session: null, departures: 1 }))

    expect(localOnly()).toEqual({ huntScore: 0, activities: 0 })
  })

  it('still clears everything when a different account signs in', () => {
    render(<Harness />)
    act(() => {
      useProgressionStore.getState().recordHunt({ score: 890, captures: 12, championLabel: 'Dame' })
    })

    act(() => useAuthStore.setState({ session: other }))

    expect(localOnly()).toEqual({ huntScore: 0, activities: 0 })
  })
})

/** A promise the test settles by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => (resolve = settle))
  return { promise, resolve }
}

const ok = (data: unknown): QueryResult => ({ data, error: null })
const failed: QueryResult = { data: null, error: { message: 'network down' } }

/** The account's row as the server holds it, built through the hook's own mapping. */
function serverRow(xp: number) {
  const snapshot: ProgressionSnapshot = { ...currentSnapshot(), xp }
  return { ...snapshotToRow(player.user.id, snapshot), updated_at: '2026-10-01T00:00:00Z' }
}

function currentSnapshot(): ProgressionSnapshot {
  const {
    xp,
    stats,
    unlockedBadges,
    huntScores,
    puzzleProgress,
    accuracyHistory,
    daily,
    activities,
  } = useProgressionStore.getState()
  return {
    xp,
    stats,
    unlockedBadges,
    huntScores,
    puzzleProgress,
    accuracyHistory,
    daily,
    activities,
  }
}

/** The xp carried by each upsert, in the order they were sent. */
function writtenXp() {
  return net.upsert.mock.calls.map(([row]) => (row as { xp: number }).xp)
}

function gain() {
  act(() => {
    useProgressionStore.getState().recordPuzzle({ flawless: false, streak: 1 })
  })
}

/** Lets pending promises settle and moves the fake clock forward. */
async function advance(ms = 0) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

/** Far past any debounce or retry delay the hook could use. */
const LONG_AFTER = 60_000

describe('useProgressionSync — network', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    net.client = net.fake
    net.pull.mockReset()
    net.upsert.mockReset().mockResolvedValue(ok(null))
    useProgressionStore.getState().reset()
    useAuthStore.setState({ isReady: true, session: null, departures: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('seeds a new account from the progress built as a guest', async () => {
    // Played as a guest, then signed in for the first time: the account has no
    // row yet, and the guest's work becomes its first one instead of being lost.
    gain()
    const guestXp = useProgressionStore.getState().xp
    expect(guestXp).toBeGreaterThan(0)
    net.pull.mockResolvedValue(ok(null))

    render(<Harness />)
    act(() => useAuthStore.setState({ session: player }))
    await advance()

    expect(net.pull).toHaveBeenCalledWith(player.user.id)
    expect(net.upsert).toHaveBeenCalledTimes(1)
    expect(net.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: player.user.id, xp: guestXp }),
      {
        onConflict: 'user_id',
      },
    )
    expect(useProgressionStore.getState().xp).toBe(guestXp)
  })

  it('lets the server copy replace the local one once the account has a row', async () => {
    gain()
    expect(useProgressionStore.getState().xp).not.toBe(500)
    net.pull.mockResolvedValue(ok(serverRow(500)))

    render(<Harness />)
    act(() => useAuthStore.setState({ session: player }))
    await advance()

    expect(useProgressionStore.getState().xp).toBe(500)
  })

  it('does not write back the snapshot it has just read', async () => {
    net.pull.mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })

    render(<Harness />)
    await advance(LONG_AFTER)

    expect(useProgressionStore.getState().xp).toBe(500)
    expect(net.upsert).not.toHaveBeenCalled()
  })

  it('does not write a store change that leaves the synced snapshot as it was', async () => {
    net.pull.mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })
    render(<Harness />)
    await advance()

    // A store update that touches nothing the row carries.
    act(() => useProgressionStore.setState({}))
    await advance(LONG_AFTER)

    expect(net.upsert).not.toHaveBeenCalled()
  })

  it('retries a failed read and hydrates once it succeeds', async () => {
    net.pull.mockResolvedValueOnce(failed).mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })

    render(<Harness />)
    await advance()
    expect(net.pull).toHaveBeenCalledTimes(1)
    expect(useProgressionStore.getState().xp).toBe(0)

    await advance(LONG_AFTER)
    expect(net.pull).toHaveBeenCalledTimes(2)
    expect(useProgressionStore.getState().xp).toBe(500)
  })

  it('never takes a read that keeps failing for an empty account', async () => {
    // Read as "no row", a failure would seed the server with this device's
    // unhydrated copy and overwrite the account's real progress.
    net.pull.mockResolvedValue(failed)
    useAuthStore.setState({ session: player })

    render(<Harness />)
    await advance(LONG_AFTER)
    const attempts = net.pull.mock.calls.length
    expect(attempts).toBeGreaterThan(1)

    gain()
    await advance(LONG_AFTER)

    expect(net.upsert).not.toHaveBeenCalled()
    // The retry is bounded: the session gives up and stays read-only.
    expect(net.pull).toHaveBeenCalledTimes(attempts)
  })

  it('holds every write until the baseline row has been read', async () => {
    const read = deferred<QueryResult>()
    net.pull.mockReturnValue(read.promise)
    useAuthStore.setState({ session: player })

    render(<Harness />)
    await advance()
    gain()
    gain()
    await advance(LONG_AFTER)
    expect(net.upsert).not.toHaveBeenCalled()

    // Confirmed absent: now the seed goes, carrying what was earned meanwhile.
    read.resolve(ok(null))
    await advance()
    expect(writtenXp()).toEqual([useProgressionStore.getState().xp])
  })

  it('folds a burst of gains into a single write', async () => {
    net.pull.mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })
    render(<Harness />)
    await advance()

    gain()
    gain()
    gain()
    await advance()
    expect(net.upsert).not.toHaveBeenCalled()

    await advance(LONG_AFTER)
    expect(writtenXp()).toEqual([useProgressionStore.getState().xp])
  })

  it('keeps one write in flight and finishes on the newest snapshot', async () => {
    net.pull.mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })
    render(<Harness />)
    await advance()

    const first = deferred<QueryResult>()
    net.upsert.mockReturnValueOnce(first.promise)

    gain()
    await advance(LONG_AFTER)
    const firstXp = useProgressionStore.getState().xp
    expect(writtenXp()).toEqual([firstXp])

    // A change lands while the first write is still on the wire: it must wait,
    // not race it.
    gain()
    await advance(LONG_AFTER)
    expect(net.upsert).toHaveBeenCalledTimes(1)

    first.resolve(ok(null))
    await advance()
    const latestXp = useProgressionStore.getState().xp
    expect(latestXp).toBeGreaterThan(firstXp)
    expect(writtenXp()).toEqual([firstXp, latestXp])
  })

  it('reports a rejected write and still counts the snapshot as unsent', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    net.pull.mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })
    render(<Harness />)
    await advance()

    net.upsert.mockResolvedValueOnce({ data: null, error: { message: 'column missing' } })
    gain()
    await advance(LONG_AFTER)
    expect(consoleError).toHaveBeenCalledWith('[progression] save failed:', 'column missing')

    // Any later store update retries it — even one that changes nothing the row
    // carries, because the failed snapshot was never marked as synchronised.
    const unsentXp = useProgressionStore.getState().xp
    act(() => useProgressionStore.setState({}))
    await advance(LONG_AFTER)
    expect(writtenXp()).toEqual([unsentXp, unsentXp])
  })

  it('sends nothing for a guest', async () => {
    render(<Harness />)
    gain()
    await advance(LONG_AFTER)

    expect(net.pull).not.toHaveBeenCalled()
    expect(net.upsert).not.toHaveBeenCalled()
  })

  it('drops a pending write when the player signs out', async () => {
    net.pull.mockResolvedValue(ok(serverRow(500)))
    useAuthStore.setState({ session: player })
    render(<Harness />)
    await advance()

    gain()
    act(() => useAuthStore.setState({ session: null, departures: 1 }))
    await advance(LONG_AFTER)

    expect(net.upsert).not.toHaveBeenCalled()
  })
})
