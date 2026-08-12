import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { AVATAR_GLYPHS } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

export default function Sidebar() {
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)

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

      {/* Nothing is shown until the stored session has been read, so the footer
          does not flash "Se connecter" at someone who already is. */}
      {isReady &&
        (session ? (
          <NavLink
            to={ROUTES.profile}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ivoire/70 transition-colors hover:bg-white/5 hover:text-ivoire"
          >
            <span aria-hidden="true" className="w-5 text-center text-lg text-or">
              {profile ? AVATAR_GLYPHS[profile.avatar_piece] : '♟'}
            </span>
            <span className="truncate">{profile?.username ?? 'Mon profil'}</span>
          </NavLink>
        ) : (
          <NavLink
            to={ROUTES.login}
            className="flex items-center justify-center gap-2 rounded-xl bg-or px-3 py-2.5 text-sm font-semibold text-ebene transition-colors hover:bg-or-light"
          >
            Se connecter
          </NavLink>
        ))}
    </aside>
  )
}
