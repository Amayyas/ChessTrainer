import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/UI/Sheet'
import { brand } from '@/lib/design-tokens'
import { cn } from '@/utils/cn'

export interface MobileNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The whole navigation, on small widths, behind the bottom bar's last column.
 *
 * This module is never imported statically. The bottom bar reaches it through
 * a dynamic import, because it pulls Radix in and the bar itself sits in the
 * entry chunk of every page — a static import would have put the dialog
 * runtime in the first paint of a site most people open to play, for a menu
 * most of them never tap. Loaded on the tap instead, it is a chunk of its own.
 */
export default function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] overflow-y-auto border-t border-white/10 bg-ebene pb-8 text-ivoire"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-ivoire">
            <span aria-hidden="true" className="text-2xl text-or">
              {brand.mark}
            </span>
            {brand.name}
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Toutes les sections" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-or/15 font-semibold text-or'
                    : 'text-ivoire/70 hover:bg-white/5 hover:text-ivoire',
                )
              }
            >
              <span aria-hidden="true" className="w-5 text-center text-lg">
                {item.glyph}
              </span>
              <span>{item.label}</span>
              <span className="sr-only">{item.description}</span>
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
