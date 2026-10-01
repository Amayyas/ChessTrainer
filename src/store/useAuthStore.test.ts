import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

type QueryResult = { data: unknown; error: { message: string } | null }

// A fake client in the shape of the one in passwordReset.test.tsx: each call
// the store makes is a mock the test answers. `lookup` is the read of the
// profile row, `update` the profile write.
const api = vi.hoisted(() => ({
  signUp: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn<(name: string) => Promise<QueryResult>>(),
  lookup: vi.fn<(column: string, value: unknown) => Promise<QueryResult>>(),
  update: vi.fn<(patch: unknown, column: string, value: unknown) => Promise<QueryResult>>(),
}))

vi.mock('@/lib/supabase', async () => ({
  ...(await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')),
  isSupabaseConfigured: true,
  supabase: {
    auth: { signUp: api.signUp, signOut: api.signOut },
    rpc: (name: string) => api.rpc(name),
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: (column: string, value: unknown) => ({
            maybeSingle: () => api.lookup(column, value),
          }),
        }),
        update: (patch: unknown) => ({
          eq: (column: string, value: unknown) => ({
            select: () => ({ single: () => api.update(patch, column, value) }),
          }),
        }),
      }
    },
  },
}))

const session = { user: { id: 'player-1' } } as unknown as Session
const profile = { id: 'player-1', username: 'magnus', avatar_piece: 'k' } as unknown as Profile

const ok = (data: unknown): QueryResult => ({ data, error: null })
const failed = (message: string): QueryResult => ({ data: null, error: { message } })

beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset()
  api.signOut.mockResolvedValue({ error: null })
  useAuthStore.setState({
    isReady: true,
    session,
    profile,
    departures: 0,
    error: null,
    deleteError: null,
  })
})

describe('useAuthStore — signUp', () => {
  const input = { email: 'new@example.com', password: 'secret123', username: 'newcomer' }

  beforeEach(() => {
    useAuthStore.setState({ session: null, profile: null, error: 'a stale failure' })
  })

  it('reports a signed-in player when a session comes back', async () => {
    api.signUp.mockResolvedValue({ data: { session }, error: null })

    await expect(useAuthStore.getState().signUp(input)).resolves.toBe('signed-in')
    expect(useAuthStore.getState().error).toBeNull()
  })

  it('reports an account awaiting confirmation when no session comes back', async () => {
    // Email confirmation on: the account exists, but nobody is signed in yet.
    api.signUp.mockResolvedValue({ data: { session: null, user: { id: 'new' } }, error: null })

    await expect(useAuthStore.getState().signUp(input)).resolves.toBe('awaiting-confirmation')
  })

  it('sends the username for the profile trigger and links back to the profile', async () => {
    api.signUp.mockResolvedValue({ data: { session: null }, error: null })

    await useAuthStore.getState().signUp(input)

    expect(api.signUp).toHaveBeenCalledWith({
      email: input.email,
      password: input.password,
      options: {
        data: { username: input.username },
        emailRedirectTo: `${window.location.origin}${ROUTES.profile}`,
      },
    })
  })

  it('fails with a message the player can read', async () => {
    api.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered' },
    })

    await expect(useAuthStore.getState().signUp(input)).resolves.toBe('failed')
    expect(useAuthStore.getState().error).toBe('Un compte existe déjà avec cet email.')
  })
})

describe('useAuthStore — deleteAccount', () => {
  it('signs the player out once the account is erased', async () => {
    api.rpc.mockResolvedValue(ok(null))

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(true)

    expect(api.rpc).toHaveBeenCalledWith('delete_my_account')
    expect(api.signOut).toHaveBeenCalledTimes(1)
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
    expect(state.profile).toBeNull()
    // Counted as a departure, so the progression store clears this device.
    expect(state.departures).toBe(1)
    expect(state.deleteError).toBeNull()
  })

  it('treats a lost reply as a success when the profile row is gone', async () => {
    // The delete went through but its answer never arrived: telling the player
    // it failed would be the wrong way round.
    api.rpc.mockResolvedValue(failed('fetch failed'))
    api.lookup.mockResolvedValue(ok(null))

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(true)

    expect(api.lookup).toHaveBeenCalledWith('id', session.user.id)
    expect(api.signOut).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      departures: 1,
      deleteError: null,
    })
  })

  it('reports the failure and keeps the session when the account is still there', async () => {
    api.rpc.mockResolvedValue(failed('permission denied'))
    api.lookup.mockResolvedValue(ok({ id: session.user.id }))

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(false)

    expect(api.signOut).not.toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      session,
      profile,
      departures: 0,
      deleteError: 'La suppression a échoué. Réessayez dans un instant.',
    })
  })

  it('reports the failure when it cannot tell whether the account is gone', async () => {
    // Network down for both requests: no honest answer, so no false success.
    api.rpc.mockResolvedValue(failed('fetch failed'))
    api.lookup.mockResolvedValue(failed('fetch failed'))

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(false)

    expect(api.signOut).not.toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBe(session)
    expect(useAuthStore.getState().deleteError).not.toBeNull()
  })

  it('clears the previous failure when trying again', async () => {
    useAuthStore.setState({ deleteError: 'La suppression a échoué. Réessayez dans un instant.' })
    api.rpc.mockResolvedValue(ok(null))

    await useAuthStore.getState().deleteAccount()

    expect(useAuthStore.getState().deleteError).toBeNull()
  })

  it('does nothing without a session', async () => {
    useAuthStore.setState({ session: null })

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(false)
    expect(api.rpc).not.toHaveBeenCalled()
  })
})

describe('useAuthStore — updateProfile', () => {
  it('writes the patch to the signed-in profile and keeps what the server returns', async () => {
    const saved = { ...profile, username: 'carlsen' }
    api.update.mockResolvedValue(ok(saved))

    await expect(useAuthStore.getState().updateProfile({ username: 'carlsen' })).resolves.toBe(true)

    expect(api.update).toHaveBeenCalledWith({ username: 'carlsen' }, 'id', session.user.id)
    expect(useAuthStore.getState().profile).toEqual(saved)
  })

  it('keeps the current profile and explains a taken username', async () => {
    api.update.mockResolvedValue(
      failed('duplicate key value violates unique constraint "profiles_username_key"'),
    )

    await expect(useAuthStore.getState().updateProfile({ username: 'taken' })).resolves.toBe(false)

    expect(useAuthStore.getState().profile).toBe(profile)
    expect(useAuthStore.getState().error).toBe('Ce pseudo est déjà pris.')
  })

  it('does nothing without a session', async () => {
    useAuthStore.setState({ session: null })

    await expect(useAuthStore.getState().updateProfile({ avatar_piece: 'q' })).resolves.toBe(false)
    expect(api.update).not.toHaveBeenCalled()
  })
})
