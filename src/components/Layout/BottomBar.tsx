import { NavLink } from 'react-router-dom'
import { BOTTOM_BAR_ITEMS } from '@/components/Layout/navigation'

export default function BottomBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-white/10 bg-ebene md:hidden"
    >
      {BOTTOM_BAR_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              isActive ? 'text-or' : 'text-ivoire/60',
            ].join(' ')
          }
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {item.glyph}
          </span>
          <span className="truncate px-1">{item.shortLabel ?? item.label}</span>
          <span className="sr-only">{item.description}</span>
        </NavLink>
      ))}
    </nav>
  )
}
