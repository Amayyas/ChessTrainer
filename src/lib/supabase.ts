import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Whether a backend is configured. Everything auth- or leaderboard-related is
 * optional: without credentials the app still runs entirely as a guest, which
 * is what section 2.6 asks for ("mode invité autorisé pour tous les modes") and
 * what lets the build and CI work with no secrets at all.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        // The JWT refreshes itself client-side (specification section 2.6).
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** The six piece symbols an avatar can be (specification section 2.6). */
export const AVATAR_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'] as const
export type AvatarPiece = (typeof AVATAR_PIECES)[number]

export const AVATAR_GLYPHS: Record<AvatarPiece, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

export interface Profile {
  id: string
  username: string
  avatar_piece: AvatarPiece
  xp: number
  level: number
  created_at: string
}

export interface ScoreRow {
  id: number
  user_id: string
  piece: string
  score: number
  captures: number
  played_at: string
}
