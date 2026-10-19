import type { ReactNode } from 'react'

/**
 * A titled block of legal prose, set as a column of text: each section opens
 * on a hairline, its title in the heading size, the prose in ink at reading
 * size, since this is the one page meant to be read through.
 */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink/30 pb-8 pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="mb-3 text-heading font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 text-pretty leading-relaxed">{children}</div>
    </section>
  )
}
