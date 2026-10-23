import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SquaresVariant } from '@/components/Board/boardTheme'

interface BoardPreferences {
  /** The dark squares: hatched in ink, as a printed diagram has them, or plain. */
  squares: SquaresVariant
  setSquares: (squares: SquaresVariant) => void
}

/**
 * How the boards are drawn on this device. The hatching is the diagram's own
 * look, but some eyes find the pieces sooner on plain squares, so the boards
 * the player plays on follow their choice. It is kept on the device, as a
 * screen setting is, rather than with the account.
 */
export const useBoardStore = create<BoardPreferences>()(
  persist(
    (set) => ({
      squares: 'hatched',
      setSquares: (squares) => set({ squares }),
    }),
    {
      name: 'chesstrainer.board',
      version: 1,
      // Anything but a variant the board knows — a hand-edited value, a later
      // version's — falls back to the hatching rather than to no squares.
      merge: (persisted, current) => ({
        ...current,
        squares:
          (persisted as Partial<BoardPreferences> | undefined)?.squares === 'plain'
            ? 'plain'
            : 'hatched',
      }),
    },
  ),
)
