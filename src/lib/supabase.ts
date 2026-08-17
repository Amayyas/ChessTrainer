import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Whether a backend is configured. Everything auth- or leaderboard-related is
 * optional: without credentials the app still runs entirely as a guest — every
 * mode stays open to one — which is also what lets the build and CI run with no
 * secrets at all.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        // The JWT refreshes itself client-side.
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** The six piece symbols an avatar can be. */
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

/**
 * The account's copy of the progression store, so XP, badges and statistics
 * follow the player across devices. `stats` holds
 * the whole ProgressionStats object as one JSON document.
 */
export interface ProgressionRow {
  user_id: string
  xp: number
  stats: unknown
  unlocked_badges: string[]
  /** Best hunt rounds per champion, as one JSON document. */
  hunt_scores: unknown
  /** Daily puzzle streak and totals, as one JSON document. */
  puzzle_progress: unknown
  /** One entry per reviewed battle, newest first, as one JSON document. */
  accuracy_history: unknown
  updated_at: string
}
