import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Button from '@/components/UI/Button'
import Modal from '@/components/UI/Modal'

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Ouvrir</Button>
      <Modal
        open={open}
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
        title="Confirmation"
        footer={<Button onClick={() => setOpen(false)}>OK</Button>}
      >
        <p>Contenu du dialogue</p>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('is not in the document while closed', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens as an accessible dialog labelled by its title', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Confirmation')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the close button is used', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalled()
  })
})
