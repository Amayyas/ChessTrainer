import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

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

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
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

/**
 * Row shapes, derived from the generated schema rather than restated, so a
 * migration that renames or drops a column fails the typecheck here — and in
 * every query builder, since the client above carries `Database` — instead of
 * in the browser. Regenerate with `npm run db:types` after a migration.
 */
type Tables = Database['public']['Tables']

/** `profiles`, with avatar_piece narrowed to the six symbols the column allows. */
export interface Profile extends Omit<Tables['profiles']['Row'], 'avatar_piece'> {
  avatar_piece: AvatarPiece
}

export type ScoreRow = Tables['scores']['Row']

/** The six JSON columns on `progression`, each a whole document from the store. */
type ProgressionJsonColumn =
  | 'stats'
  | 'hunt_scores'
  | 'puzzle_progress'
  | 'accuracy_history'
  | 'daily_counters'
  | 'activity_feed'

/**
 * The account's copy of the progression store, so XP, badges and statistics
 * follow the player across devices.
 *
 * The scalar columns keep their generated types, so a column renamed or retyped
 * in a migration fails the typecheck. The JSON columns are widened to `unknown`:
 * they come back from a column any client can write, and sync.ts folds each onto
 * a known shape at read time rather than trusting its contents.
 */
export type ProgressionRow = Omit<Tables['progression']['Row'], ProgressionJsonColumn> &
  Record<ProgressionJsonColumn, unknown>

/** The shape `snapshotToRow` builds for an upsert into `progression`. */
export type ProgressionInsert = Tables['progression']['Insert']
