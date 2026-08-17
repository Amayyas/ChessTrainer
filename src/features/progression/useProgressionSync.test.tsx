import { render } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgressionSync } from '@/features/progression/useProgressionSync'
import { useAuthStore } from '@/store/useAuthStore'
import { useProgressionStore } from '@/store/useProgressionStore'

// The tests run with no backend, so the network half of the hook stays inert and
// only the ownership decision — the part that wiped progress — is exercised.
vi.mock('@/lib/supabase', async () => ({
  ...(await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')),
  supabase: null,
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
