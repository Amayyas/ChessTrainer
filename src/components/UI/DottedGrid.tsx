import { cn } from '@/utils/cn'

export interface DottedGridProps {
  className?: string
}

/**
 * A decorative dotted grid with a soft glow at its centre, for the dark hero
 * bands.
 *
 * All CSS: two stacked backgrounds — a repeating radial-gradient for the dots
 * and one large radial-gradient for the gold glow — faded out towards the edges
 * with a mask so the pattern never meets a hard border. No animation, so nothing
 * to gate behind `prefers-reduced-motion`.
 *
 * Sits behind content as `absolute inset-0`; the parent needs `position:
 * relative` and `overflow: hidden`. Purely visual, so `aria-hidden`.
 */
export default function DottedGrid({ className }: DottedGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            // The glow: one wide gold radial, brightest a third of the way down
            // where the headline sits.
            'radial-gradient(60% 55% at 30% 35%, rgba(201, 168, 76, 0.14), transparent 70%)',
            // The dots: a 1px light speck repeated on a 24px lattice.
            'radial-gradient(rgba(245, 240, 232, 0.12) 1px, transparent 1.5px)',
          ].join(', '),
          backgroundSize: '100% 100%, 24px 24px',
          // Fade the whole thing towards the edges so it reads as texture, not a
          // panel with a seam.
          maskImage: 'radial-gradient(ellipse 80% 80% at 40% 40%, #000 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 40% 40%, #000 40%, transparent 100%)',
        }}
      />
    </div>
  )
}
