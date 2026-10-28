import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  checkUpload,
  isJpeg,
  MAX_PHOTO_BYTES,
  PHOTO_ERROR_CODES,
  readModeration,
  statusFor,
  toBase64,
} from './rules'

/** The smallest byte run isJpeg accepts, padded to a given length. */
function jpeg(length = 16): Uint8Array {
  const bytes = new Uint8Array(length)
  bytes.set([0xff, 0xd8, 0xff], 0)
  bytes.set([0xff, 0xd9], length - 2)
  return bytes
}

describe('the size limit', () => {
  it("is the bucket's own, so a photo the function accepts is one storage accepts", () => {
    const migration = readFileSync('supabase/migrations/20261029090000_profile_photo.sql', 'utf8')
    const limit = /values \('avatars', 'avatars', true, (\d+),/.exec(migration)?.[1]
    expect(Number(limit)).toBe(MAX_PHOTO_BYTES)
  })

  it('refuses one byte over it', () => {
    expect(checkUpload(jpeg(MAX_PHOTO_BYTES))).toBeNull()
    expect(checkUpload(jpeg(MAX_PHOTO_BYTES + 1))).toBe('too_large')
  })
})

describe('isJpeg', () => {
  it('reads the bytes, not the name or the declared type', () => {
    expect(isJpeg(jpeg())).toBe(true)
    // An HTML page sent as image/jpeg: served from the bucket, it would be a
    // page on Supabase's domain carrying whatever the sender wrote.
    expect(isJpeg(new TextEncoder().encode('<html><script>alert(1)</script></html>'))).toBe(false)
    // A PNG.
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false)
  })

  it('refuses a JPEG cut short, with no end marker', () => {
    expect(isJpeg(jpeg().subarray(0, 14))).toBe(false)
    // Each half of the end marker on its own.
    const noD9 = jpeg()
    noD9[15] = 0x00
    expect(isJpeg(noD9)).toBe(false)
    const noFf = jpeg()
    noFf[14] = 0x00
    expect(isJpeg(noFf)).toBe(false)
    expect(checkUpload(new Uint8Array([0xff, 0xd8]))).toBe('not_jpeg')
  })
})

describe('readModeration', () => {
  it('lets through only what was read as not flagged', () => {
    expect(readModeration({ results: [{ flagged: false }] })).toBe('accepted')
    expect(readModeration({ results: [{ flagged: true }] })).toBe('refused')
    expect(readModeration({ results: [{ flagged: false }, { flagged: true }] })).toBe('refused')
  })

  it('refuses to guess at a response it cannot read', () => {
    // Read as "not flagged", any of these would let the photo through on an
    // error page, a changed API or an empty answer.
    for (const body of [
      null,
      'Internal Server Error',
      {},
      { results: [] },
      { results: [{}] },
      { results: [{ flagged: 'false' }] },
      { error: { message: 'rate limited' } },
    ]) {
      expect(readModeration(body), JSON.stringify(body)).toBeNull()
    }
  })
})

describe('statusFor', () => {
  it('gives every failure an HTTP error status', () => {
    for (const code of PHOTO_ERROR_CODES) {
      expect(statusFor(code), code).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('toBase64', () => {
  it('encodes a photo larger than one slice, as Node does', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 31) % 256)
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
  })
})
