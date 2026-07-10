import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { ROUTES } from '@/routes'

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-ebene px-4 py-6 md:flex">
      <NavLink to={ROUTES.home} className="mb-8 flex items-center gap-3 px-2">
        <span aria-hidden="true" className="text-3xl text-or">
          ♞
        </span>
        <span className="font-display text-xl font-bold text-ivoire">ChessTrainer</span>
      </NavLink>

      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === ROUTES.home}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-or/15 font-semibold text-or'
                  : 'text-ivoire/70 hover:bg-white/5 hover:text-ivoire',
              ].join(' ')
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

      <p className="px-3 text-xs text-ivoire/60">v2.0 — Free Project</p>
    </aside>
  )
}
