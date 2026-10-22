/**
 * The typographic cross a dialog or a sheet closes on, in place of an icon
 * from a library. Hidden from assistive technology: the button around it
 * carries the label.
 */
export default function CloseGlyph() {
  return (
    <span aria-hidden="true" className="text-[1.75rem] leading-none">
      ×
    </span>
  )
}
