import { useRef, useState } from 'react'
import { Button } from '@/components/UI'
import { PHOTO_MESSAGES, toSquareJpeg } from '@/lib/photo'
import { useAuthStore } from '@/store/useAuthStore'

type Note = { tone: 'done' | 'problem'; text: string }

/**
 * Choosing a photo from the device, or removing it. The photo is squared and
 * re-encoded here, then checked by the server before it is published; until
 * the answer comes back, the player is told it is being checked rather than
 * shown a spinner with no explanation.
 */
export default function PhotoPicker({ photoPath }: { photoPath: string | null }) {
  const setPhoto = useAuthStore((state) => state.setPhoto)
  const removePhoto = useAuthStore((state) => state.removePhoto)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'sending' | 'removing' | null>(null)
  const [note, setNote] = useState<Note | null>(null)

  const send = async (file: File) => {
    setBusy('sending')
    setNote(null)
    let jpeg: Blob
    try {
      jpeg = await toSquareJpeg(file)
    } catch {
      setNote({ tone: 'problem', text: PHOTO_MESSAGES.unreadable })
      setBusy(null)
      return
    }
    const problem = await setPhoto(jpeg)
    setNote(problem ? { tone: 'problem', text: problem } : { tone: 'done', text: 'Photo publiée.' })
    setBusy(null)
  }

  const remove = async () => {
    setBusy('removing')
    setNote(null)
    const problem = await removePhoto()
    setNote(problem ? { tone: 'problem', text: problem } : { tone: 'done', text: 'Photo retirée.' })
    setBusy(null)
  }

  return (
    <div>
      <p className="mb-1.5 text-caption font-semibold">Photo</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="photo-input"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so choosing the same file again, after a refusal, fires.
          event.target.value = ''
          if (file) void send(file)
        }}
      />
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          isLoading={busy === 'sending'}
          onClick={() => input.current?.click()}
        >
          {photoPath ? 'Changer de photo' : 'Choisir une photo'}
        </Button>
        {photoPath && (
          <Button
            variant="quiet"
            size="sm"
            disabled={busy !== null}
            isLoading={busy === 'removing'}
            onClick={() => void remove()}
          >
            Retirer la photo
          </Button>
        )}
      </div>
      {busy === 'sending' ? (
        <p className="mt-1.5 text-caption italic text-ink-soft">Vérification de la photo…</p>
      ) : note?.tone === 'problem' ? (
        <p role="alert" className="mt-1.5 text-caption font-semibold text-rubric">
          {note.text}
        </p>
      ) : note?.tone === 'done' ? (
        <p role="status" className="mt-1.5 text-caption italic">
          {note.text}
        </p>
      ) : (
        <p className="mt-1.5 text-caption italic text-ink-soft">
          Vérifiée automatiquement avant d'être publiée, elle remplace votre pièce partout,
          classement compris. Les autres joueurs peuvent la signaler.
        </p>
      )}
    </div>
  )
}
