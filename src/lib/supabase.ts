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

/**
 * The kind of link this page was opened with, read from the URL fragment.
 *
 * Read here, before createClient, because the client consumes the fragment and
 * clears it — this is the only moment it can be seen. It is what tells a
 * recovery link apart from a confirmation link once both have become an
 * ordinary session.
 *
 * It matters because Supabase does not always land on the address we asked for:
 * a redirect target it does not recognise falls back to the project's Site URL,
 * which drops the visitor on the home page with a spent token and nothing to
 * use it on.
 */
function readAuthLinkType(): 'recovery' | 'signup' | null {
  if (typeof window === 'undefined') return null
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const type = fragment.get('type')
  return type === 'recovery' || type === 'signup' ? type : null
}

export const authLinkType = readAuthLinkType()

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
  /** The day's challenge counters, as one JSON document. */
  daily_counters: unknown
  /** The recent activity feed, newest first, as one JSON document. */
  activity_feed: unknown
  updated_at: string
}
