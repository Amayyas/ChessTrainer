import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BOTTOM_BAR_ITEMS } from '@/components/Layout/navigation'
import { cn } from '@/utils/cn'

/** Tailwind's `md`, which is where the bar gives way to the sidebar. */
const SIDEBAR_QUERY = '(min-width: 768px)'

/**
 * Dynamic, and it has to stay that way: this bar renders in the entry chunk of
 * every page, and the sheet it opens pulls the Radix dialog runtime behind it.
 * A static import would spend that weight on the first paint of every visit for
 * a menu that opens on a tap.
 */
const MobileNavSheet = lazy(() => import('@/components/Layout/MobileNavSheet'))

const ITEM_CLASSES = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors'

export default function BottomBar() {
  /**
   * Two pieces of state, not one. `mounted` latches on the first tap and never
   * goes back, so the chunk is fetched once; `open` is what the sheet actually
   * follows. Both flip together on that first tap, which means the sheet opens
   * as soon as its code lands rather than needing a second tap.
   */
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  /**
   * The bar is md:hidden; the sheet is portaled to the body and is not. Opening
   * the menu on a phone and then rotating it left the sheet covering a page
   * that already had its sidebar back, with the button holding aria-expanded
   * now hidden — only Escape or the X could close it.
   */
  useEffect(() => {
    if (!open) return
    const query = window.matchMedia(SIDEBAR_QUERY)
    if (query.matches) {
      setOpen(false)
      return
    }
    const close = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false)
    }
    query.addEventListener('change', close)
    return () => query.removeEventListener('change', close)
  }, [open])

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-white/10 bg-ebene md:hidden"
      >
        {BOTTOM_BAR_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(ITEM_CLASSES, isActive ? 'text-or' : 'text-ivoire/60')}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              {item.glyph}
            </span>
            <span className="truncate px-1">{item.shortLabel ?? item.label}</span>
            <span className="sr-only">{item.description}</span>
          </NavLink>
        ))}

        {/* The sixth column. A unicode glyph rather than a lucide icon on
            purpose: an icon import here would pull the icon library into the
            entry chunk, which is the weight this whole arrangement avoids. */}
        <button
          type="button"
          onClick={() => {
            setMounted(true)
            setOpen(true)
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(ITEM_CLASSES, open ? 'text-or' : 'text-ivoire/60')}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ☰
          </span>
          <span className="truncate px-1">Plus</span>
          <span className="sr-only">Profil, classement et toutes les sections</span>
        </button>
      </nav>

      {mounted && (
        <Suspense fallback={null}>
          <MobileNavSheet open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}
