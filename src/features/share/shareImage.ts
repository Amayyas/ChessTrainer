/** What became of an image handed over: shared, saved, or the share sheet closed. */
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/** Whether this browser can hand a file to the system's share sheet. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([], 'probe.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/** Saves the image under `filename`, through a link the browser downloads. */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // After the click has handed the file over: revoking at once can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Hands the image to the system's share sheet, where a phone lists the apps
 * that take a picture; saves it instead where there is no such sheet. A sheet
 * the player closes is not a failure, and saves nothing behind their back.
 */
export async function shareImage(
  blob: Blob,
  filename: string,
  text: string,
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (canShareFiles() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Refused for another reason: fall through to saving it.
    }
  }
  downloadImage(blob, filename)
  return 'downloaded'
}
