/**
 * What a username may be, as the client sees it. The database is the
 * authority — `is_valid_username()` and the unique index on `username_key()`
 * in supabase/migrations — and supabase/tests/rls.test.ts checks that it
 * accepts every letter listed here, so the two cannot drift apart unnoticed.
 */
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 24

/** Accented letters with a single unaccented base, both cases. */
export const USERNAME_ACCENTED_LETTERS = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ'

const ALLOWED = new RegExp(`^[A-Za-z0-9_${USERNAME_ACCENTED_LETTERS}-]*$`)

/**
 * The form a typed name is stored in. Composed (NFC) because a keyboard may
 * produce "é" as "e" plus a combining accent, which is not in the character
 * set; trimmed because a trailing space is never meant.
 */
export function normalizeUsername(raw: string): string {
  return raw.normalize('NFC').trim()
}

export const USERNAME_TAKEN = 'Ce pseudo est déjà pris.'
export const USERNAME_FORMAT = 'Lettres, chiffres, _ et - uniquement, sans espace.'

/** Why a name cannot be used, in the player's words, or null when it can. */
export function usernameProblem(name: string): string | null {
  if (name.length < USERNAME_MIN_LENGTH) return `Au moins ${USERNAME_MIN_LENGTH} caractères.`
  if (name.length > USERNAME_MAX_LENGTH) return `${USERNAME_MAX_LENGTH} caractères au maximum.`
  if (!ALLOWED.test(name)) return USERNAME_FORMAT
  return null
}

export type UsernameStatus = 'invalid' | 'taken' | 'available'
