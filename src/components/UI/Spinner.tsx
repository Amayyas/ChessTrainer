import { cn } from '@/utils/cn'

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
} as const

export interface SpinnerProps {
  size?: keyof typeof SIZES
  className?: string
  /** Accessible label; falls back to a generic loading text. */
  label?: string
}

/**
 * Loading indicator. Used now by the button, and later as the "spinner during
 * Stockfish computation" mitigation the specification calls for in section 06.
 * Pure CSS animation so it keeps spinning even while the main thread is busy.
 */
export default function Spinner({ size = 'md', className, label = 'Chargement' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-[spin-slow_0.7s_linear_infinite] rounded-full border-current border-t-transparent',
        SIZES[size],
        className,
      )}
    />
  )
}
