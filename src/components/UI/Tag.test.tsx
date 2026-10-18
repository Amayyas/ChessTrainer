import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Tag, { type TagTone } from '@/components/UI/Tag'

// Every tone, checked against the component's own map by the type: a tone
// added to Tag.tsx and missing here fails the typecheck.
const TONES = Object.keys({
  muted: true,
  ink: true,
  accent: true,
  alert: true,
} satisfies Record<TagTone, true>) as TagTone[]

describe('Tag', () => {
  it('renders its content as a span, muted by default', () => {
    render(<Tag>Tactique</Tag>)
    const tag = screen.getByText('Tactique')
    expect(tag.tagName).toBe('SPAN')
    expect(tag).toHaveAttribute('data-tone', 'muted')
  })

  it('is never a pill', () => {
    // No rounded corner and no shadow in any tone: the newsprint page sets its
    // labels as words, not as lozenges.
    for (const tone of TONES) {
      const { unmount } = render(<Tag tone={tone}>Mot</Tag>)
      const classes = screen.getByText('Mot').className
      expect(classes, tone).not.toMatch(/\brounded-|\bshadow-/)
      unmount()
    }
  })

  it('takes the same height in every tone', () => {
    // A status changes tone as it goes, and an alert that stood taller than
    // the tag it replaced would push down everything under it. The alert's
    // fill pads it, and an equal negative margin gives the height back.
    for (const tone of TONES) {
      const { unmount } = render(<Tag tone={tone}>Mot</Tag>)
      const classes = screen.getByText('Mot').className.split(/\s+/)
      const padding = classes.find((c) => c.startsWith('py-'))?.slice('py-'.length)
      const margin = classes.find((c) => c.startsWith('-my-'))?.slice('-my-'.length)
      expect(margin, tone).toBe(padding)
      unmount()
    }
  })

  it('tells an alert from an accent by its form, not by its colour alone', () => {
    // Both are the rubric. The alert is a filled block and the accent bare
    // text, which a reader who cannot tell the reds apart still sees.
    render(
      <>
        <Tag tone="alert">Alerte</Tag>
        <Tag tone="accent">Accent</Tag>
      </>,
    )
    expect(screen.getByText('Alerte').className).toMatch(/\bbg-/)
    expect(screen.getByText('Accent').className).not.toMatch(/\bbg-/)
  })
})
