import { Link, NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/Layout/navigation'
import { PAGE_WIDTH } from '@/components/Layout/pageWidth'
import DoubleRule from '@/components/UI/DoubleRule'
import PlayerAvatar from '@/components/UI/PlayerAvatar'
import { brand } from '@/lib/design-tokens'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/utils/cn'

const CAPITALS = 'text-kicker font-semibold uppercase'

/**
 * Who is reading: a way to sign in, or the account once signed in. Nothing
 * until the stored session has been read, so the masthead does not flash
 * "Se connecter" at someone who already is; the empty box keeps its height so
 * nothing moves when it fills.
 */
function Account({ className }: { className?: string }) {
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const box = cn('inline-flex min-h-11 items-center', className)

  if (!isReady) return <span aria-hidden="true" className={box} />
  if (session) {
    return (
      <NavLink
        to={ROUTES.profile}
        className={cn(box, 'gap-2 text-caption transition-colors hover:text-rubric')}
      >
        <PlayerAvatar
          piece={profile?.avatar_piece ?? 'p'}
          photoPath={profile?.photo_path}
          className="size-6"
        />
        <span className="max-w-[12rem] truncate">{profile?.username ?? 'Mon profil'}</span>
      </NavLink>
    )
  }
  return (
    <NavLink
      to={ROUTES.login}
      className={cn(
        box,
        CAPITALS,
        'underline-offset-4 transition-colors hover:text-rubric hover:underline',
      )}
    >
      Se connecter
    </NavLink>
  )
}

/**
 * The sections, as a paper's section bar: words in capitals between hairline
 * rules, the current one underlined in the rubric. Screens of 1024 px and up;
 * below, the bottom bar carries the navigation.
 */
function SectionBar({ compact, className }: { compact: boolean; className?: string }) {
  return (
    <nav aria-label="Navigation principale" className={cn('hidden lg:block', className)}>
      <ul className="flex flex-wrap justify-center">
        {NAV_ITEMS.map((item) => (
          <li
            key={item.path}
            className="relative before:absolute before:inset-y-4 before:left-0 before:border-l before:border-ink/30 first:before:hidden"
          >
            <NavLink
              to={item.path}
              end={item.path === ROUTES.dashboard}
              className={cn(
                'block transition-colors hover:text-rubric',
                CAPITALS,
                compact ? 'px-3.5 leading-[44px]' : 'px-[1.2rem] leading-[48px]',
                'aria-[current=page]:underline aria-[current=page]:decoration-rubric',
                'aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[7px]',
              )}
            >
              {item.label}
              <span className="sr-only"> — {item.description}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The head of every page, set as a newspaper's.
 *
 * The landing carries the full masthead: a line of tagline and sign-in, the
 * nameplate across the page, the double rule, then the section bar. Every
 * other page carries the compact one: nameplate, sections and account on one
 * line from 1280 px (on two from 1024), over the double rule.
 */
export default function Masthead({ variant }: { variant: 'full' | 'compact' }) {
  if (variant === 'full') {
    return (
      <header className={PAGE_WIDTH}>
        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto]">
          <p
            className={cn(
              CAPITALS,
              'order-3 pb-3 text-center text-ink-soft',
              'sm:order-none sm:flex sm:min-h-11 sm:items-center sm:border-b sm:border-ink/30 sm:pb-0 sm:text-left',
            )}
          >
            {brand.promise}.
          </p>
          <Account className="order-1 self-end sm:order-none sm:border-b sm:border-ink/30" />
          <Link
            to={ROUTES.home}
            className="order-2 justify-self-center pb-1.5 text-center text-title font-bold sm:order-none sm:col-span-2 sm:pb-[22px] sm:pt-7 sm:text-display sm:font-bold"
          >
            {brand.name}
          </Link>
        </div>
        <DoubleRule />
        <SectionBar compact={false} className="border-b border-ink" />
      </header>
    )
  }

  return (
    <header className={PAGE_WIDTH}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 py-1.5 xl:min-h-[76px] xl:flex-nowrap xl:py-0">
        <Link to={ROUTES.home} className="text-title font-bold">
          {brand.name}
        </Link>
        <SectionBar compact className="order-last w-full xl:order-none xl:w-auto xl:flex-1" />
        <Account />
      </div>
      <DoubleRule />
    </header>
  )
}
