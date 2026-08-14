import type { ReactNode } from 'react'
import { Card } from '@/components/UI'

/** A titled block of legal prose. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mb-4">
      <h2 className="mb-2 font-display text-lg font-bold text-ebene">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-ardoise">{children}</div>
    </Card>
  )
}

/**
 * Marks a detail only the publisher can supply. Visible on purpose: a notice
 * that quietly states the wrong company is worse than one that shows what is
 * still missing.
 */
export function TODO({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-or/25 px-1 font-medium text-ebene">
      [à compléter&nbsp;: {children}]
    </mark>
  )
}

/** Shown at the top of both documents while any TODO above is unfilled. */
export function LegalPlaceholderNotice() {
  return (
    <div className="mb-6 rounded-xl border border-or/40 bg-or/10 px-4 py-3 text-sm text-ebene">
      <strong>Document à compléter avant la mise en ligne.</strong> Les passages surlignés demandent
      des informations que seul l'éditeur du site peut fournir. Ce texte décrit fidèlement le
      fonctionnement de l'application, mais il n'a pas valeur de conseil juridique.
    </div>
  )
}
