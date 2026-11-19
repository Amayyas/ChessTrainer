import { EDITION_CHOICES, useEditionStore, type EditionChoice } from '@/features/theme/edition'
import { cn } from '@/utils/cn'

const LABELS: Record<EditionChoice, string> = {
  auto: 'Auto',
  day: 'Jour',
  night: 'Soir',
}

/**
 * The edition the page is printed in, as the paper prints a day and an
 * evening edition: Auto follows the system, Jour and Soir hold one.
 *
 * Native radio buttons rather than the toggle group the pages use: the footer
 * is on every page, the landing included, and the toggle group's code would
 * join the first load for three words. The radios are a group to assistive
 * technology by themselves, and always hold exactly one choice.
 */
export default function EditionPicker({ className }: { className?: string }) {
  const edition = useEditionStore((state) => state.edition)
  const setEdition = useEditionStore((state) => state.setEdition)

  return (
    <fieldset className={cn('flex items-center gap-x-3', className)}>
      <legend className="float-left mr-1 text-kicker font-semibold uppercase">Édition</legend>
      {EDITION_CHOICES.map((choice) => (
        <label
          key={choice}
          className={cn(
            'inline-flex min-h-11 cursor-pointer items-center text-caption transition-colors hover:text-rubric',
            'has-[:checked]:underline has-[:checked]:decoration-rubric has-[:checked]:decoration-2 has-[:checked]:underline-offset-[7px]',
            'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rubric',
          )}
        >
          <input
            type="radio"
            name="edition"
            value={choice}
            checked={edition === choice}
            onChange={() => setEdition(choice)}
            className="sr-only"
          />
          {LABELS[choice]}
        </label>
      ))}
    </fieldset>
  )
}
