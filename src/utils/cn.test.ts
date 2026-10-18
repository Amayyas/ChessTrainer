import { describe, expect, it } from 'vitest'
import { typeScale } from '@/lib/design-tokens'
import { cn } from '@/utils/cn'

describe('cn', () => {
  it('keeps a type-scale size beside a colour', () => {
    // Unregistered, tailwind-merge reads `text-body` as a colour and drops it
    // in favour of the ink, so the text silently loses its size.
    for (const size of Object.keys(typeScale)) {
      expect(cn(`text-${size}`, 'text-ink')).toBe(`text-${size} text-ink`)
    }
  })

  it('lets a later size override an earlier one, scale or not', () => {
    expect(cn('text-sm', 'text-body')).toBe('text-body')
    expect(cn('text-body', 'text-display')).toBe('text-display')
    expect(cn('text-caption', 'text-lg')).toBe('text-lg')
  })

  it('still settles colour conflicts', () => {
    // The control: registering the sizes must not turn colours into sizes.
    expect(cn('text-ink', 'text-rubric')).toBe('text-rubric')
  })
})
