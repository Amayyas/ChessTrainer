interface ModuleStubProps {
  glyph: string
  title: string
  /** Specification module number that will implement this screen. */
  module: string
  summary: string
}

/**
 * Placeholder screen added in module M1 to validate routing.
 * Each page is replaced by its real implementation in its own module.
 */
export default function ModuleStub({ glyph, title, module, summary }: ModuleStubProps) {
  return (
    <section className="mx-auto max-w-2xl py-12 text-center">
      {/* Ebony medallion: gold on ivory is only 2:1, too low (spec section 4.2, WCAG AA). */}
      <span
        aria-hidden="true"
        className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-ebene text-4xl text-or"
      >
        {glyph}
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold text-ebene">{title}</h1>
      <p className="mt-3 text-ardoise">{summary}</p>
      <p className="mt-6 inline-block rounded-full bg-ebene/5 px-4 py-1.5 text-sm text-ardoise">
        Implementation prevue au module {module}
      </p>
    </section>
  )
}
