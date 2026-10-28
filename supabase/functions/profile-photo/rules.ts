/**
 * The profile-photo function's decisions, kept free of Deno and of the network
 * so Vitest can hold them, and so the browser can import the same error codes
 * and size limit instead of restating them.
 */

/** Matches the "avatars" bucket's file_size_limit in the migration. */
export const MAX_PHOTO_BYTES = 256 * 1024

/** Every way a request can fail, as the function reports it to the browser. */
export const PHOTO_ERROR_CODES = [
  'unauthenticated',
  'not_jpeg',
  'too_large',
  'rate_limited',
  'under_review',
  'refused',
  'unavailable',
  'failed',
] as const

export type PhotoErrorCode = (typeof PHOTO_ERROR_CODES)[number]

export function isPhotoErrorCode(value: unknown): value is PhotoErrorCode {
  return (PHOTO_ERROR_CODES as readonly unknown[]).includes(value)
}

const STATUS: Record<PhotoErrorCode, number> = {
  unauthenticated: 401,
  not_jpeg: 415,
  too_large: 413,
  rate_limited: 429,
  under_review: 403,
  refused: 422,
  unavailable: 503,
  failed: 500,
}

export function statusFor(code: PhotoErrorCode): number {
  return STATUS[code]
}

/**
 * A JPEG starts with the SOI marker and an APPn or other marker (FF D8 FF) and
 * ends with EOI (FF D9). Checked on the bytes, not on the declared type, which
 * the client chooses: the bucket would otherwise serve whatever it was handed
 * under image/jpeg.
 */
export function isJpeg(bytes: Uint8Array): boolean {
  const n = bytes.length
  return (
    n >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[n - 2] === 0xff &&
    bytes[n - 1] === 0xd9
  )
}

/** What is wrong with an upload before anyone looks at it, or null. */
export function checkUpload(bytes: Uint8Array): PhotoErrorCode | null {
  if (bytes.length > MAX_PHOTO_BYTES) return 'too_large'
  if (!isJpeg(bytes)) return 'not_jpeg'
  return null
}

/**
 * The verdict in an OpenAI moderation response: 'accepted', 'refused', or null
 * when the body is not one — in which case the photo is not let through. A
 * check that cannot be read is a check that did not happen.
 */
export function readModeration(body: unknown): 'accepted' | 'refused' | null {
  if (typeof body !== 'object' || body === null) return null
  const results = (body as { results?: unknown }).results
  if (!Array.isArray(results) || results.length === 0) return null
  const flags = results.map((result) =>
    typeof result === 'object' && result !== null
      ? (result as { flagged?: unknown }).flagged
      : undefined,
  )
  if (flags.some((flag) => typeof flag !== 'boolean')) return null
  return flags.includes(true) ? 'refused' : 'accepted'
}

/** Base64 without a dependency: btoa exists in Deno, in browsers and in Node. */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  // In slices: spreading a whole photo into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
