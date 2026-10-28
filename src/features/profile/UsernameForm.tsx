import { useState, type FormEvent } from 'react'
import { Button } from '@/components/UI'
import Input from '@/components/UI/Input'
import { useUsernameCheck } from '@/features/auth/useUsernameCheck'
import {
  normalizeUsername,
  USERNAME_FORMAT,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/lib/username'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Renaming, from the profile. The same checks as on the sign-up form, then the
 * write; the database checks again, so a name taken between the question and
 * the write still comes back as a message rather than a silent failure.
 */
export default function UsernameForm({ current }: { current: string }) {
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const usernameCheck = useUsernameCheck()
  const [draft, setDraft] = useState(current)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const unchanged = normalizeUsername(draft) === current
  const problem = usernameCheck.problem ?? saveError

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (unchanged) return
    setIsSaving(true)
    const name = await usernameCheck.validate(draft)
    if (name && (await updateProfile({ username: name }))) {
      setDraft(name)
      setSaved(true)
    } else if (name) {
      setSaveError(useAuthStore.getState().error)
    }
    setIsSaving(false)
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="profile-username" className="mb-1.5 block text-caption font-semibold">
        Pseudo
      </label>
      <div className="flex gap-2.5">
        <Input
          id="profile-username"
          type="text"
          required
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          autoComplete="nickname"
          value={draft}
          aria-invalid={problem !== null}
          aria-describedby="profile-username-note"
          onChange={(event) => {
            setDraft(event.target.value)
            usernameCheck.clear()
            setSaveError(null)
            setSaved(false)
          }}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={unchanged || isSaving}
          isLoading={isSaving}
        >
          Enregistrer
        </Button>
      </div>
      {problem ? (
        <p
          id="profile-username-note"
          role="alert"
          className="mt-1.5 text-caption font-semibold text-rubric"
        >
          {problem}
        </p>
      ) : saved ? (
        <p id="profile-username-note" role="status" className="mt-1.5 text-caption italic">
          Pseudo enregistré.
        </p>
      ) : (
        <p id="profile-username-note" className="mt-1.5 text-caption italic text-ink-soft">
          {USERNAME_FORMAT}
        </p>
      )}
    </form>
  )
}
