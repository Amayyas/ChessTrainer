import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/UI/Sheet'
import { brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'
import { cn } from '@/utils/cn'

export interface MobileNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The whole navigation, on small widths, behind the bottom bar's last column:
 * every section as a ruled list, its figurine in a column of its own, the
 * current one underlined in the rubric.
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
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle className="text-title font-bold">{brand.name}</SheetTitle>
        </SheetHeader>

        <nav aria-label="Toutes les sections">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className="border-t border-ink/30 first:border-t-0">
                <NavLink
                  to={item.path}
                  end={item.path === ROUTES.dashboard}
                  onClick={() => onOpenChange(false)}
                  className="flex min-h-12 items-center gap-4 text-body transition-colors hover:text-rubric"
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className="w-7 text-center font-figurine text-[1.4rem] leading-none"
                      >
                        {item.glyph}
                      </span>
                      <span
                        className={cn(
                          isActive &&
                            'font-semibold underline decoration-rubric decoration-2 underline-offset-[6px]',
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="sr-only">{item.description}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
