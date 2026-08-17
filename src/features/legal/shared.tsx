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
