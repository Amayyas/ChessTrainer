import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShareDiagram from '@/features/share/ShareDiagram'

const renderDiagram = vi.fn()
const shareImage = vi.fn()
vi.mock('@/features/share/renderDiagram', () => ({ renderDiagram }))
vi.mock('@/features/share/shareImage', () => ({ shareImage }))

const request = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  orientation: 'w' as const,
  lastMove: null,
}

beforeEach(() => {
  renderDiagram.mockReset().mockResolvedValue(new Blob(['png']))
  shareImage.mockReset()
})

describe('ShareDiagram', () => {
  it('draws the position it is given and says where the image went', async () => {
    shareImage.mockResolvedValue('downloaded')
    render(<ShareDiagram request={request} />)
    await userEvent.click(screen.getByRole('button', { name: 'Partager le diagramme' }))
    expect(renderDiagram).toHaveBeenCalledWith(request)
    expect(await screen.findByText('Image du diagramme enregistrée.')).toBeInTheDocument()
  })

  it('says nothing when the share sheet was closed', async () => {
    shareImage.mockResolvedValue('cancelled')
    render(<ShareDiagram request={request} />)
    await userEvent.click(screen.getByRole('button', { name: 'Partager le diagramme' }))
    await screen.findByRole('button', { name: 'Partager le diagramme' })
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('says so when the image cannot be made', async () => {
    renderDiagram.mockRejectedValue(new Error('no canvas'))
    render(<ShareDiagram request={request} />)
    await userEvent.click(screen.getByRole('button', { name: 'Partager le diagramme' }))
    expect(await screen.findByText('L’image n’a pas pu être créée.')).toBeInTheDocument()
    expect(shareImage).not.toHaveBeenCalled()
  })
})
