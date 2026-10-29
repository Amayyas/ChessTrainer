import { supabase } from '@/lib/supabase'
import { MAX_PHOTO_BYTES, type PhotoErrorCode } from '../../supabase/functions/profile-photo/rules'

/** The side, in pixels, every profile photo is stored at. */
export const PHOTO_SIDE = 256

/** The largest centred square in a picture, as a crop for drawImage. */
export function centredSquare(width: number, height: number) {
  const side = Math.min(width, height)
  return { sx: (width - side) / 2, sy: (height - side) / 2, side }
}

/**
 * Any picture the browser can decode — a phone's photo, a PNG, a HEIC on
 * Safari — cropped to its centre, scaled to PHOTO_SIDE and re-encoded as JPEG.
 *
 * Re-encoding is not only for size: a canvas carries pixels and nothing else,
 * so the camera's metadata, the location a phone writes into a photo
 * included, never leaves the device.
 */
export async function toSquareJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { sx, sy, side } = centredSquare(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_SIDE
  canvas.height = PHOTO_SIDE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no 2d context')
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE)
  bitmap.close()

  // At this size a photo comes to a few tens of kilobytes; the lower
  // qualities are for the rare noisy one that does not.
  for (const quality of [0.85, 0.7, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob
  }
  throw new Error('photo too large')
}

/** Where a stored photo is served from, or null with no backend. */
export function photoUrl(path: string): string | null {
  return supabase?.storage.from('avatars').getPublicUrl(path).data.publicUrl ?? null
}

/** What went wrong, for the player. `unreadable` is the browser's own failure. */
export const PHOTO_MESSAGES: Record<PhotoErrorCode | 'unreadable', string> = {
  unreadable: "Cette image n'a pas pu être lue. Essayez une autre photo.",
  unauthenticated: 'Votre session a expiré. Reconnectez-vous, puis réessayez.',
  not_jpeg: "Cette image n'a pas pu être lue. Essayez une autre photo.",
  too_large: 'Cette photo est trop lourde, même réduite. Essayez-en une autre.',
  rate_limited: "Trop d'essais en une heure. Réessayez un peu plus tard.",
  under_review:
    'Votre photo précédente a été signalée et attend une vérification. Vous pourrez en envoyer une nouvelle ensuite.',
  refused: "Cette photo n'a pas été acceptée : elle ne respecte pas les règles du site.",
  unavailable:
    'La vérification des photos est indisponible pour le moment. Réessayez dans un instant.',
  failed: 'Une erreur est survenue. Réessayez dans un instant.',
}
