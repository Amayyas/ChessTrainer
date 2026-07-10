interface ModuleStubProps {
  glyph: string
  title: string
  /** Numero du module du cahier des charges qui implementera cet ecran. */
  module: string
  summary: string
}

/**
 * Ecran d'attente pose au module M1 pour valider le routing.
 * Chaque page est remplacee par sa vraie implementation a son module.
 */
export default function ModuleStub({ glyph, title, module, summary }: ModuleStubProps) {
  return (
    <section className="mx-auto max-w-2xl py-12 text-center">
      {/* Medaillon ebene : l'or sur ivoire ne fait que 2:1, insuffisant (section 4.2, WCAG AA). */}
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
