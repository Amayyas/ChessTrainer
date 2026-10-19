import { Link } from 'react-router-dom'
import { Tag } from '@/components/UI'
import { MODES } from '@/features/home/modes'

/**
 * The game modes, set as a paper sets its columns: side by side between
 * hairline rules, each one link, its figurine standing over the title. Four
 * columns from 1024 px, two from 640, and below that a ruled list with the
 * figurine beside the words.
 *
 * Rendered on both the dashboard and the public landing. The data lives in
 * modes.ts; this is the markup, kept in one place for the same reason — a change
 * to how a mode reads should not have to be made twice.
 */
export default function ModeGrid() {
  return (
    <ul className="mt-5 grid grid-cols-1 sm:mt-9 sm:grid-cols-2 sm:gap-y-8 lg:grid-cols-4 lg:gap-y-0">
      {MODES.map((mode) => (
        <li
          key={mode.to}
          className="border-t border-ink/30 first:border-t-0 sm:border-t-0 sm:px-7 sm:odd:pl-0 sm:even:border-l lg:border-l lg:first:border-l-0 lg:last:pr-0 lg:[&:nth-child(3)]:pl-7"
        >
          <Link
            to={mode.to}
            className="group grid h-full grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3.5 py-[18px] sm:block sm:py-0 sm:pb-1"
          >
            <span
              aria-hidden="true"
              className="row-span-3 mt-0.5 font-figurine text-[2.5rem] leading-none sm:mb-[18px] sm:block sm:text-[4.125rem]"
            >
              {mode.glyph}
            </span>
            <h3 className="mb-1 text-heading font-semibold underline decoration-transparent decoration-2 underline-offset-[5px] transition-colors group-hover:decoration-rubric sm:mb-2">
              {mode.title}
            </h3>
            <Tag className="mb-2 sm:mb-3">{mode.badge}</Tag>
            <p className="col-start-2 text-pretty text-caption sm:text-body">{mode.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
