import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase, type AvatarPiece, type Profile } from '@/lib/supabase'

interface AuthState {
  /** False until the stored session has been read, so guards do not flash. */
  isReady: boolean
  session: Session | null
  profile: Profile | null
  error: string | null
  /**
   * Kept apart from `error`: the deletion panel would otherwise open showing a
   * stale failure from an avatar change, and keep showing its own after being
   * cancelled and reopened.
   */
  deleteError: string | null

  initialise: () => () => void
  signUp: (input: { email: string; password: string; username: string }) => Promise<boolean>
  signIn: (input: { email: string; password: string }) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (patch: { username?: string; avatar_piece?: AvatarPiece }) => Promise<boolean>
  /** Erases the account and everything filed under it. Irreversible. */
  deleteAccount: () => Promise<boolean>
  clearDeleteError: () => void
  clearError: () => void
}

/** Supabase messages are technical and in English; these are for the player. */
function friendlyError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (text.includes('already registered')) return 'Un compte existe déjà avec cet email.'
  if (text.includes('password')) return 'Le mot de passe doit faire au moins 6 caractères.'
  if (text.includes('email')) return 'Adresse email invalide.'
  if (text.includes('duplicate key') || text.includes('profiles_username'))
    return 'Ce pseudo est déjà pris.'
  return 'Une erreur est survenue. Réessayez dans un instant.'
}

/**
 * Authentication and the signed-in profile (spec section 2.6). Every action is
 * a no-op when no backend is configured, so guest play is never blocked.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  isReady: !isSupabaseConfigured,
  session: null,
  profile: null,
  error: null,
  deleteError: null,

  initialise: () => {
    // Captured once so the closures below keep the non-null narrowing.
    const client = supabase
    if (!client) {
      set({ isReady: true })
      return () => {}
    }

    // Sign-out, then sign-in, can overlap: without this token a slow first
    // request could land last and hand the new session the old profile.
    let latestRequest = 0

    const loadProfile = async (session: Session | null) => {
      const request = ++latestRequest
      if (!session) {
        set({ profile: null })
        return
      }
      // Straight after sign-in the request can outrun the token attachment and
      // be rejected; awaiting the session first makes sure it is in place.
      await client.auth.getSession()
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (request !== latestRequest) return
      // Keep any existing profile on a failed fetch rather than blanking it.
      if (error) return
      set({ profile: (data as Profile | null) ?? null })
    }

    void client.auth.getSession().then(async ({ data }) => {
      set({ session: data.session })
      await loadProfile(data.session)
      set({ isReady: true })
    })

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      // Drop the profile as soon as the account changes. The fetch below is
      // asynchronous and deliberately keeps what it has when it fails, so
      // without this the previous player's name and avatar would stay on screen
      // under the new session — briefly on a switch, indefinitely on an error.
      const previous = get().session?.user.id ?? null
      const next = session?.user.id ?? null
      if (previous !== next) set({ session, profile: null })
      else set({ session })
      void loadProfile(session)
    })

    return () => subscription.subscription.unsubscribe()
  },

  signUp: async ({ email, password, username }) => {
    if (!supabase) return false
    set({ error: null })
    // The username travels in the metadata; a database trigger creates the
    // profile, so an account can never exist without one.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) {
      set({ error: friendlyError(error.message) })
      return false
    }
    return true
  },

  signIn: async ({ email, password }) => {
    if (!supabase) return false
    set({ error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: friendlyError(error.message) })
      return false
    }
    return true
  },

  signInWithGoogle: async () => {
    if (!supabase) return
    set({ error: null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` },
    })
    if (error) set({ error: friendlyError(error.message) })
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },

  deleteAccount: async () => {
    const client = supabase
    const userId = get().session?.user.id
    if (!client || !userId) return false
    set({ deleteError: null })
    // The server takes the account from the session and cascades the delete,
    // so nothing is left behind and nobody can aim this at another account.
    const { error } = await client.rpc('delete_my_account')

    if (error) {
      // A rejection and a reply lost on the way back look identical from here,
      // and the second one means the account is already gone. Telling someone
      // their erasure failed when it succeeded is the wrong way round, so ask
      // the database which it was: the profile row goes with the account.
      const { data, error: lookupFailed } = await client
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!lookupFailed && data === null) {
        await client.auth.signOut()
        set({ session: null, profile: null })
        return true
      }

      // Either the account is still there, or the network is down and there is
      // no honest answer. Report the failure; a retry is harmless, since
      // deleting an account that has already gone succeeds quietly.
      set({ deleteError: 'La suppression a échoué. Réessayez dans un instant.' })
      return false
    }
    // The account is gone; the session that outlived it would only produce
    // confusing failures, so it goes too. The progression store clears itself
    // when it sees the session disappear.
    await client.auth.signOut()
    set({ session: null, profile: null })
    return true
  },

  updateProfile: async (patch) => {
    const { session } = get()
    if (!supabase || !session) return false
    set({ error: null })
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      set({ error: friendlyError(error.message) })
      return false
    }
    set({ profile: data as Profile })
    return true
  },

  clearError: () => set({ error: null }),

  clearDeleteError: () => set({ deleteError: null }),
}))
