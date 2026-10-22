import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/**
 * A text field, as a form printed on paper draws one: a one-pixel ink frame
 * on bright paper, square, the height of a fingertip. The focus ring is the
 * global one. Every attribute passes through to the native <input>, so type,
 * autocomplete and the ARIA states work as they do on a bare one.
 */
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'min-h-11 w-full border border-ink bg-paper-bright px-3 py-2 text-ink',
        'placeholder:text-ink-faint aria-[invalid=true]:border-rubric',
        className,
      )}
      {...props}
    />
  )
})

export default Input
