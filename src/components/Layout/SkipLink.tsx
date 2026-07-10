/** Lien d'evitement clavier — section 4.2, navigation clavier. */
export default function SkipLink() {
  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ebene focus:px-4 focus:py-2 focus:text-ivoire"
    >
      Aller au contenu principal
    </a>
  )
}
