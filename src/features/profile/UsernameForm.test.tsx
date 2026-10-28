import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsernameForm from '@/features/profile/UsernameForm'
import { USERNAME_TAKEN } from '@/lib/username'
import { useAuthStore } from '@/store/useAuthStore'

const checkUsername = vi.fn()
const updateProfile = vi.fn()

// The store is a module singleton: restore it whole so a mocked action from one
// test is never still installed in the next.
const initialState = useAuthStore.getState()

beforeEach(() => {
  checkUsername.mockReset().mockResolvedValue('available')
  updateProfile.mockReset().mockResolvedValue(true)
  useAuthStore.setState(initialState, true)
  useAuthStore.setState({ checkUsername, updateProfile, error: null })
})

function rename(to: string) {
  fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: to } })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
}

describe('UsernameForm', () => {
  it('has nothing to save until the name changes', () => {
    render(<UsernameForm current="magnus" />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()

    // A trailing space is not a change: it would be trimmed before sending.
    fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: 'magnus ' } })
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('saves a free name and says so', async () => {
    render(<UsernameForm current="remi" />)
    rename('Rémi')

    // By its text: while saving, the button's spinner is a status of its own.
    expect(await screen.findByText('Pseudo enregistré.')).toHaveAttribute('role', 'status')
    expect(updateProfile).toHaveBeenCalledWith({ username: 'Rémi' })
  })

  it('does not write a name already taken', async () => {
    checkUsername.mockResolvedValue('taken')
    render(<UsernameForm current="magnus" />)
    rename('hikaru')

    expect(await screen.findByRole('alert')).toHaveTextContent(USERNAME_TAKEN)
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('shows why the database refused the write', async () => {
    // Free when asked, taken by the time of the write: the race the question
    // cannot close, which the unique index does.
    updateProfile.mockImplementation(async () => {
      useAuthStore.setState({ error: USERNAME_TAKEN })
      return false
    })
    render(<UsernameForm current="magnus" />)
    rename('hikaru')

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(USERNAME_TAKEN))
    expect(screen.queryByText('Pseudo enregistré.')).not.toBeInTheDocument()
  })
})
