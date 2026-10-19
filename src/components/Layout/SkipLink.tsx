/** Keyboard skip link: the first stop on every page, straight to its content. */
export default function SkipLink() {
  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-ink focus:px-[18px] focus:py-3 focus:font-semibold focus:text-paper"
    >
      Aller au contenu principal
    </a>
  )
}
