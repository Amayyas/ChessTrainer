import type { ReactNode } from 'react'
import { RUBRIC_ALERT } from '@/components/UI/rubricBlock'
import { cn } from '@/utils/cn'

/**
 * What needs acting on, as a paragraph: the rubric as a solid block, read out
 * as an alert. Its classes, the link rule included, are RUBRIC_ALERT's.
 */
export default function Alert({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p role="alert" className={cn(RUBRIC_ALERT, className)}>
      {children}
    </p>
  )
}
