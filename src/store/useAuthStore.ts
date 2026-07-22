import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase, type AvatarPiece, type Profile } from '@/lib/supabase'

interface AuthState {
  /** False until the stored session has been read, so guards do not flash. */
  isReady: boolean
  session: Session | null
  profile: Profile | null
  error: string | null

  initialise: () => () => void
  signUp: (input: { email: string; password: string; username: string }) => Promise<boolean>
  signIn: (input: { email: string; password: string }) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (patch: { username?: string; avatar_piece?: AvatarPiece }) => Promise<boolean>
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

  initialise: () => {
    // Captured once so the closures below keep the non-null narrowing.
    const client = supabase
    if (!client) {
      set({ isReady: true })
      return () => {}
    }

    const loadProfile = async (session: Session | null) => {
      if (!session) {
        set({ profile: null })
        return
      }
      const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      set({ profile: (data as Profile | null) ?? null })
    }

    void client.auth.getSession().then(async ({ data }) => {
      set({ session: data.session })
      await loadProfile(data.session)
      set({ isReady: true })
    })

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      set({ session })
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
}))
