import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BOTTOM_BAR_ITEMS } from '@/components/Layout/navigation'
import { ROUTES } from '@/routes'
import { cn } from '@/utils/cn'

/** Tailwind's `lg`, which is where the bar gives way to the masthead's section bar. */
const SECTION_BAR_QUERY = '(min-width: 1024px)'

/**
 * Dynamic, and it has to stay that way: this bar renders in the entry chunk of
 * every page, and the sheet it opens pulls the Radix dialog runtime behind it.
 * A static import would spend that weight on the first paint of every visit for
 * a menu that opens on a tap.
 */
const MobileNavSheet = lazy(() => import('@/components/Layout/MobileNavSheet'))

const ITEM_CLASSES =
  'flex min-h-[62px] w-full flex-col items-center justify-center gap-[5px] px-0.5 pb-[9px] pt-2 text-ink'

/** The label under each figurine, underlined in the rubric when it is the current one. */
function label(current: boolean) {
  return cn(
    // No truncation: its overflow clip would cut the underline off. At 10 px
    // the longest label, "Tableau", fits a sixth of the screen from 360 px
    // (measured: 54 px wide, in a 49 px column at 320); below, it sets at 9.
    'whitespace-nowrap font-semibold uppercase leading-tight',
    'text-[0.5625rem] tracking-[0.01em] min-[360px]:text-[0.625rem] min-[360px]:tracking-[0.05em]',
    current && 'underline decoration-rubric decoration-2 underline-offset-4',
  )
}

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
   * The bar is lg:hidden; the sheet is portaled to the body and is not. Opening
   * the menu on a tablet and then rotating it left the sheet covering a page
   * that already had its section bar back, with the button holding
   * aria-expanded now hidden — only Escape or the cross could close it.
   */
  useEffect(() => {
    if (!open) return
    const query = window.matchMedia(SECTION_BAR_QUERY)
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
        className="fixed inset-x-0 bottom-0 z-10 border-t border-ink bg-paper lg:hidden"
      >
        <ul className="grid grid-cols-6 px-1.5">
          {BOTTOM_BAR_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} end={item.path === ROUTES.dashboard} className={ITEM_CLASSES}>
                {({ isActive }) => (
                  <>
                    <span aria-hidden="true" className="font-figurine text-[1.45rem] leading-none">
                      {item.glyph}
                    </span>
                    <span className={label(isActive)}>{item.shortLabel ?? item.label}</span>
                    <span className="sr-only">{item.description}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {/* The sixth column. Three rules drawn inline: the figurine face has
              no menu sign, and this bar sits in the entry chunk, whose weight
              this whole arrangement guards. */}
          <li>
            <button
              type="button"
              onClick={() => {
                setMounted(true)
                setOpen(true)
              }}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={ITEM_CLASSES}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.45rem] fill-current">
                <rect x="4" y="7" width="16" height="1.5" />
                <rect x="4" y="11.25" width="16" height="1.5" />
                <rect x="4" y="15.5" width="16" height="1.5" />
              </svg>
              <span className={label(open)}>Plus</span>
              <span className="sr-only">Profil, classement et toutes les sections</span>
            </button>
          </li>
        </ul>
      </nav>

      {mounted && (
        <Suspense fallback={null}>
          <MobileNavSheet open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}
