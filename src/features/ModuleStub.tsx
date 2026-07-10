import { Badge, Card } from '@/components/UI'

interface ModuleStubProps {
  glyph: string
  title: string
  /** Specification module number that will implement this screen. */
  module: string
  summary: string
}

/**
 * Placeholder screen added in module M1 to validate routing, restyled in M2
 * with the design system. Each page is replaced by its real implementation in
 * its own module.
 */
export default function ModuleStub({ glyph, title, module, summary }: ModuleStubProps) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      {/* Ebony medallion: gold on ivory is only 2:1, too low (spec section 4.2, WCAG AA). */}
      <span
        aria-hidden="true"
        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-ebene text-4xl text-or"
      >
        {glyph}
      </span>
      <h1 className="font-display text-3xl font-bold text-ebene">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-ardoise">{summary}</p>
      <div className="mt-6">
        <Badge variant="gold">Bientôt — module {module}</Badge>
      </div>
    </Card>
  )
}
