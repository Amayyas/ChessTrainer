import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PhotoPicker from '@/features/profile/PhotoPicker'
import { PHOTO_MESSAGES } from '@/lib/photo'
import { useAuthStore } from '@/store/useAuthStore'

// jsdom has no canvas to draw on, so the squaring is stood in for; what is
// under test is what the picker does with its result.
const squared = new Blob(['squared'], { type: 'image/jpeg' })
const toSquareJpeg = vi.hoisted(() => vi.fn())
vi.mock('@/lib/photo', async () => ({
  ...(await vi.importActual<typeof import('@/lib/photo')>('@/lib/photo')),
  toSquareJpeg,
}))

const setPhoto = vi.fn()
const removePhoto = vi.fn()
const initialState = useAuthStore.getState()

beforeEach(() => {
  toSquareJpeg.mockReset().mockResolvedValue(squared)
  setPhoto.mockReset().mockResolvedValue(null)
  removePhoto.mockReset().mockResolvedValue(null)
  useAuthStore.setState(initialState, true)
  useAuthStore.setState({ setPhoto, removePhoto })
})

function choose(file = new File(['raw'], 'holiday.heic', { type: 'image/heic' })) {
  fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } })
  return file
}

describe('PhotoPicker', () => {
  it('sends the squared photo, never the original file', async () => {
    // The original carries the camera's metadata, location included.
    render(<PhotoPicker photoPath={null} />)
    const file = choose()

    expect(await screen.findByText('Photo publiée.')).toHaveAttribute('role', 'status')
    expect(toSquareJpeg).toHaveBeenCalledWith(file)
    expect(setPhoto).toHaveBeenCalledWith(squared)
  })

  it('says why the server turned it down', async () => {
    setPhoto.mockResolvedValue(PHOTO_MESSAGES.refused)
    render(<PhotoPicker photoPath={null} />)
    choose()

    expect(await screen.findByRole('alert')).toHaveTextContent(PHOTO_MESSAGES.refused)
  })

  it('sends nothing the browser could not read', async () => {
    toSquareJpeg.mockRejectedValue(new Error('decode failed'))
    render(<PhotoPicker photoPath={null} />)
    choose()

    expect(await screen.findByRole('alert')).toHaveTextContent(PHOTO_MESSAGES.unreadable)
    expect(setPhoto).not.toHaveBeenCalled()
  })

  it('offers to remove a photo only when there is one', async () => {
    const { rerender } = render(<PhotoPicker photoPath={null} />)
    expect(screen.queryByRole('button', { name: 'Retirer la photo' })).not.toBeInTheDocument()

    rerender(<PhotoPicker photoPath="player/a.jpg" />)
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la photo' }))

    await waitFor(() => expect(removePhoto).toHaveBeenCalled())
    expect(await screen.findByText('Photo retirée.')).toBeInTheDocument()
  })
})
