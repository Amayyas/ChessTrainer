import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '@/lib/supabase'
import { PHOTO_MESSAGES } from '@/lib/photo'
import { USERNAME_FORMAT } from '@/lib/username'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

type QueryResult = { data: unknown; error: { message: string } | null }

// A fake client in the shape of the one in passwordReset.test.tsx: each call
// the store makes is a mock the test answers. `lookup` is the read of the
// profile row, `update` the profile write.
const api = vi.hoisted(() => ({
  signUp: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn<(name: string, args?: unknown) => Promise<QueryResult>>(),
  lookup: vi.fn<(column: string, value: unknown) => Promise<QueryResult>>(),
  update: vi.fn<(patch: unknown, column: string, value: unknown) => Promise<QueryResult>>(),
  invoke: vi.fn<(name: string, options: unknown) => Promise<QueryResult>>(),
}))

vi.mock('@/lib/supabase', async () => ({
  ...(await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')),
  isSupabaseConfigured: true,
  supabase: {
    auth: { signUp: api.signUp, signOut: api.signOut },
    functions: { invoke: (name: string, options: unknown) => api.invoke(name, options) },
    rpc: (name: string, args?: unknown) =>
      args === undefined ? api.rpc(name) : api.rpc(name, args),
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

  it('explains a name the format check refused, rather than calling it taken', async () => {
    // The format constraint's name also begins "profiles_username", which the
    // duplicate test matches on.
    api.update.mockResolvedValue(
      failed(
        'new row for relation "profiles" violates check constraint "profiles_username_format"',
      ),
    )

    await expect(useAuthStore.getState().updateProfile({ username: 'a b' })).resolves.toBe(false)

    expect(useAuthStore.getState().error).toBe(USERNAME_FORMAT)
  })

  it('does nothing without a session', async () => {
    useAuthStore.setState({ session: null })

    await expect(useAuthStore.getState().updateProfile({ avatar_piece: 'q' })).resolves.toBe(false)
    expect(api.update).not.toHaveBeenCalled()
  })
})

/** How functions.invoke reports a non-2xx answer: the Response as `context`. */
const answered = (status: number, body: unknown): QueryResult =>
  ({
    data: null,
    error: {
      message: 'Edge Function returned a non-2xx status code',
      context: Response.json(body, { status }),
    },
  }) as unknown as QueryResult

describe('useAuthStore — photo', () => {
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })

  it('puts the stored photo on the profile', async () => {
    api.invoke.mockResolvedValue(ok({ photo_path: 'player-1/new.jpg' }))

    await expect(useAuthStore.getState().setPhoto(jpeg)).resolves.toBeNull()

    expect(api.invoke).toHaveBeenCalledWith('profile-photo', {
      body: jpeg,
      headers: { 'Content-Type': 'image/jpeg' },
    })
    expect(useAuthStore.getState().profile?.photo_path).toBe('player-1/new.jpg')
  })

  it('says why the function refused it, and keeps the profile as it was', async () => {
    api.invoke.mockResolvedValue(answered(422, { error: 'refused' }))

    await expect(useAuthStore.getState().setPhoto(jpeg)).resolves.toBe(PHOTO_MESSAGES.refused)
    expect(useAuthStore.getState().profile).toBe(profile)
  })

  it('falls back to a plain failure on an answer it does not know', async () => {
    api.invoke.mockResolvedValue(answered(502, { error: 'bad gateway' }))
    await expect(useAuthStore.getState().setPhoto(jpeg)).resolves.toBe(PHOTO_MESSAGES.failed)

    api.invoke.mockResolvedValue(failed('Failed to send a request to the Edge Function'))
    await expect(useAuthStore.getState().setPhoto(jpeg)).resolves.toBe(PHOTO_MESSAGES.failed)
  })

  it('takes the photo off the profile', async () => {
    useAuthStore.setState({ profile: { ...profile, photo_path: 'player-1/old.jpg' } })
    api.invoke.mockResolvedValue(ok({ photo_path: null }))

    await expect(useAuthStore.getState().removePhoto()).resolves.toBeNull()

    expect(api.invoke).toHaveBeenCalledWith('profile-photo', { method: 'DELETE' })
    expect(useAuthStore.getState().profile?.photo_path).toBeNull()
  })

  it('reports another player through the database, which reads the photo itself', async () => {
    api.rpc.mockResolvedValue(ok(null))

    await expect(useAuthStore.getState().reportPhoto('player-2')).resolves.toBe(true)
    expect(api.rpc).toHaveBeenCalledWith('report_photo', { p_target: 'player-2' })
  })
})

describe('useAuthStore — deleteAccount with a photo', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: { ...profile, photo_path: 'player-1/old.jpg' } })
  })

  it('removes the photo before the account', async () => {
    api.invoke.mockResolvedValue(ok({ photo_path: null }))
    api.rpc.mockResolvedValue(ok(null))

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(true)

    expect(api.invoke).toHaveBeenCalledWith('profile-photo', { method: 'DELETE' })
    expect(api.invoke.mock.invocationCallOrder[0]).toBeLessThan(
      api.rpc.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('keeps the account when the photo could not be removed', async () => {
    // The account's cascade does not reach storage: deleted first, the account
    // would leave a photo nobody can ask to have removed any more.
    api.invoke.mockResolvedValue(failed('Failed to send a request to the Edge Function'))

    await expect(useAuthStore.getState().deleteAccount()).resolves.toBe(false)

    expect(api.rpc).not.toHaveBeenCalledWith('delete_my_account')
    expect(useAuthStore.getState().session).toBe(session)
    expect(useAuthStore.getState().deleteError).toMatch(/photo/)
  })
})

describe('useAuthStore — checkUsername', () => {
  it('passes on what the database answers', async () => {
    api.rpc.mockResolvedValue(ok('taken'))

    await expect(useAuthStore.getState().checkUsername('Rémi')).resolves.toBe('taken')
    expect(api.rpc).toHaveBeenCalledWith('username_status', { candidate: 'Rémi' })
  })

  it('answers nothing when the question could not be asked', async () => {
    // Null lets the form go ahead; a guess of "taken" would block every sign-up
    // whenever the network hiccups.
    api.rpc.mockResolvedValue(failed('fetch failed'))

    await expect(useAuthStore.getState().checkUsername('Rémi')).resolves.toBeNull()
  })

  it('answers nothing to a reply it does not recognise', async () => {
    api.rpc.mockResolvedValue(ok('maybe'))

    await expect(useAuthStore.getState().checkUsername('Rémi')).resolves.toBeNull()
  })
})
