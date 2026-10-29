import { describe, expect, it } from 'vitest'
import { centredSquare, PHOTO_MESSAGES } from '@/lib/photo'
import { PHOTO_ERROR_CODES } from '../../supabase/functions/profile-photo/rules'

describe('centredSquare', () => {
  it('crops a landscape photo at its centre, full height', () => {
    expect(centredSquare(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 })
  })

  it('crops a portrait photo at its centre, full width', () => {
    expect(centredSquare(1080, 1920)).toEqual({ sx: 0, sy: 420, side: 1080 })
  })

  it('leaves a square one whole', () => {
    expect(centredSquare(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 })
  })
})

describe('PHOTO_MESSAGES', () => {
  it('has words for every failure the function can answer with', () => {
    for (const code of PHOTO_ERROR_CODES) {
      expect(PHOTO_MESSAGES[code], code).toMatch(/\S/)
    }
  })
})
