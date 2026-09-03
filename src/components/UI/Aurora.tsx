import { cn } from '@/utils/cn'

export interface AuroraProps {
  className?: string
}

/**
 * A slow aurora for the dark hero bands: two wide, blurred gold and ivory
 * gradients drifting behind the content, masked to fade out before the edges.
 *
 * All CSS. The drift is a 24s transform loop; `prefers-reduced-motion` freezes
 * it to a static wash (the `motion-reduce` variants below), so the resting
 * frame is always something to look at rather than a blank panel.
 *
 * Sits behind content as `absolute inset-0`; the parent needs `position:
 * relative` and `overflow: hidden`. Purely decorative, so `aria-hidden`.
 */
export default function Aurora({ className }: AuroraProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{
        maskImage: 'radial-gradient(ellipse 85% 85% at 35% 40%, #000 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 35% 40%, #000 30%, transparent 100%)',
      }}
    >
      <div
        className="absolute -left-[15%] -top-[40%] h-[150%] w-[75%] animate-aurora-slow rounded-full opacity-80 blur-3xl motion-reduce:animate-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(201, 168, 76, 0.55), transparent 62%)',
        }}
      />
      <div
        className="absolute -right-[15%] -top-[10%] h-[140%] w-[65%] animate-aurora-slower rounded-full opacity-55 blur-3xl motion-reduce:animate-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(245, 240, 232, 0.32), transparent 58%)',
        }}
      />
    </div>
  )
}
