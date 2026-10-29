import { useState } from 'react'
import { INLINE_LINK_PLAIN } from '@/components/UI/link'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/utils/cn'

type Stage = 'idle' | 'confirming' | 'sending' | 'done' | 'failed'

/**
 * Reporting a player's photo, from their leaderboard row. Asks once more
 * before sending, since a report cannot be withdrawn. The database counts one
 * report per player per photo and takes the photo down at its threshold;
 * nothing here needs to know the number.
 */
export default function ReportPhoto({ target, username }: { target: string; username: string }) {
  const reportPhoto = useAuthStore((state) => state.reportPhoto)
  const [stage, setStage] = useState<Stage>('idle')
  const action = cn(INLINE_LINK_PLAIN, 'text-caption')

  if (stage === 'done') {
    return (
      <span role="status" className="text-caption italic text-ink-soft">
        Photo signalée. Merci.
      </span>
    )
  }

  if (stage === 'idle' || stage === 'failed') {
    return (
      <span className="text-caption">
        <button
          type="button"
          className={action}
          aria-label={`Signaler la photo de ${username}`}
          onClick={() => setStage('confirming')}
        >
          Signaler la photo
        </button>
        {stage === 'failed' && (
          <span role="alert" className="ml-2 font-semibold text-rubric">
            Le signalement n'est pas parti. Réessayez.
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-3 text-caption">
      <span>Signaler cette photo comme inappropriée&nbsp;?</span>
      <button
        type="button"
        className={cn(action, 'font-semibold')}
        disabled={stage === 'sending'}
        onClick={async () => {
          setStage('sending')
          setStage((await reportPhoto(target)) ? 'done' : 'failed')
        }}
      >
        Signaler
      </button>
      <button type="button" className={action} onClick={() => setStage('idle')}>
        Annuler
      </button>
    </span>
  )
}
