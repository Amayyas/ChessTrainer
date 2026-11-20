import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shareImage } from '@/features/share/shareImage'

const image = new Blob(['png'], { type: 'image/png' })

let clicked: string[] = []
beforeEach(() => {
  clicked = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.download)
  })
  URL.createObjectURL = vi.fn(() => 'blob:diagram')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(navigator, { canShare: undefined, share: undefined })
})

function shareSheet(share: () => Promise<void>) {
  Object.assign(navigator, { canShare: vi.fn(() => true), share: vi.fn(share) })
}

describe('shareImage', () => {
  it('hands the image to the share sheet where there is one', async () => {
    shareSheet(async () => {})
    expect(await shareImage(image, 'd.png', 'texte')).toBe('shared')
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'texte', files: [expect.any(File)] }),
    )
    expect(clicked).toEqual([])
  })

  it('saves nothing when the player closes the sheet', async () => {
    shareSheet(async () => {
      throw new DOMException('closed', 'AbortError')
    })
    expect(await shareImage(image, 'd.png', 'texte')).toBe('cancelled')
    expect(clicked).toEqual([])
  })

  it('saves the image where the sheet refuses it, or where there is none', async () => {
    shareSheet(async () => {
      throw new DOMException('no', 'NotAllowedError')
    })
    expect(await shareImage(image, 'd.png', 'texte')).toBe('downloaded')

    Object.assign(navigator, { canShare: undefined, share: undefined })
    expect(await shareImage(image, 'd.png', 'texte')).toBe('downloaded')
    expect(clicked).toEqual(['d.png', 'd.png'])
  })
})
