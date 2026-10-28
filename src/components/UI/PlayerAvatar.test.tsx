import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PlayerAvatar from '@/components/UI/PlayerAvatar'
import { AVATAR_GLYPHS } from '@/lib/supabase'

// No backend is configured under test, so the real photoUrl answers null for
// every path. The stand-in builds the URL the way the bucket would.
vi.mock('@/lib/photo', () => ({
  photoUrl: (path: string) =>
    `https://example.supabase.co/storage/v1/object/public/avatars/${path}`,
}))

const photo = (container: HTMLElement) => container.querySelector('img')

describe('PlayerAvatar', () => {
  it('shows the piece when there is no photo', () => {
    const { container } = render(<PlayerAvatar piece="q" photoPath={null} />)
    expect(photo(container)).toBeNull()
    expect(container).toHaveTextContent(AVATAR_GLYPHS.q)
  })

  it('shows the photo in place of the piece, as decoration beside the name', () => {
    const { container } = render(<PlayerAvatar piece="q" photoPath="player/a.jpg" />)
    const image = photo(container)
    expect(image).toHaveAttribute(
      'src',
      'https://example.supabase.co/storage/v1/object/public/avatars/player/a.jpg',
    )
    // Empty alt: the name is always printed next to it, and a screen reader
    // reading "photo of hikaru, hikaru" says nothing new.
    expect(image).toHaveAttribute('alt', '')
    expect(container).not.toHaveTextContent(AVATAR_GLYPHS.q)
  })

  it('falls back to the piece when the photo will not load', () => {
    // A photo taken down by reports leaves a page loaded before it still
    // naming the file: a broken image there would read as a fault.
    const { container } = render(<PlayerAvatar piece="q" photoPath="player/gone.jpg" />)
    fireEvent.error(photo(container)!)
    expect(photo(container)).toBeNull()
    expect(container).toHaveTextContent(AVATAR_GLYPHS.q)
  })

  it('renders nothing on screen for assistive technology', () => {
    render(<PlayerAvatar piece="q" photoPath={null} />)
    expect(screen.queryByRole('img')).toBeNull()
  })
})
