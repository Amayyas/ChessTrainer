import { useState } from 'react'
import { photoUrl } from '@/lib/photo'
import { AVATAR_GLYPHS, type AvatarPiece } from '@/lib/supabase'
import { cn } from '@/utils/cn'

interface PlayerAvatarProps {
  piece: string
  photoPath?: string | null
  /** Sizes the photo: a square, so one size class, such as `size-7`. */
  className?: string
  /** Sizes the piece shown in its place: a font size and line height. */
  glyphClassName?: string
}

/**
 * A player as the paper shows them: their photo, printed like a press
 * portrait — square, in greys, framed by a hairline — or their piece when
 * they have none. Decorative in both cases: the name is always beside it.
 *
 * The piece also stands in when the photo fails to load, for instance in the
 * moment between a photo being taken down and a page that still names it
 * being refreshed.
 */
export default function PlayerAvatar({
  piece,
  photoPath,
  className,
  glyphClassName,
}: PlayerAvatarProps) {
  const url = photoPath ? photoUrl(photoPath) : null
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (url && url !== failedUrl) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(url)}
        className={cn('shrink-0 border border-ink object-cover grayscale', className)}
      />
    )
  }
  return (
    <span aria-hidden="true" className={cn('font-figurine', glyphClassName)}>
      {AVATAR_GLYPHS[piece as AvatarPiece] ?? '♟'}
    </span>
  )
}
