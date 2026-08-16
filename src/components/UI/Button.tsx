import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import Spinner from '@/components/UI/Spinner'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  // Contrast pairs verified against WCAG AA.
  primary: 'bg-or text-ebene hover:bg-or-light shadow-gold',
  secondary: 'bg-ebene text-ivoire hover:bg-ebene-light',
  ghost: 'bg-transparent text-ebene hover:bg-ebene/5',
  outline: 'border border-ebene/20 text-ebene hover:border-ebene/40 hover:bg-ebene/5',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

/**
 * Design-system button. Wraps a native <button> so type,
 * disabled and every ARIA attribute pass straight through.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </motion.button>
  )
})

export default Button
