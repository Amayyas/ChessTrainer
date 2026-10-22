import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/utils/cn'

const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

interface BoardFrameProps {
  orientation?: 'white' | 'black'
  /** Set on the framed square, for what is drawn inside it. */
  style?: CSSProperties
  className?: string
  children?: ReactNode
}

/**
 * A diagram's frame, as a chess column prints one: the square inside a double
 * ink rule, the ranks down its left side and the files along its foot, in
 * italic, outside the frame. It holds no board of its own, so a page can show
 * it, the same size, while the board's code is still on its way.
 *
 * The frame paints the squares itself, from the `--board-squares` its style
 * sets, and the board drawn inside it is transparent. So a frame shown before
 * the board arrives already holds the squares: the landing's diagram is the
 * largest thing on the page, and its first paint is not kept waiting for a
 * script.
 */
export default function BoardFrame({
  orientation = 'white',
  style,
  className,
  children,
}: BoardFrameProps) {
  const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse()
  const files = orientation === 'white' ? FILES : [...FILES].reverse()
  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-[13px] gap-y-[9px]', className)}>
      <ol
        aria-hidden="true"
        className="grid grid-rows-8 items-center justify-items-end text-kicker italic text-ink-soft"
      >
        {ranks.map((rank) => (
          <li key={rank}>{rank}</li>
        ))}
      </ol>
      <div
        style={style}
        className="relative aspect-square border-2 border-ink bg-paper-bright bg-[image:var(--board-squares)] bg-[length:100%_100%] outline outline-1 outline-offset-[3px] outline-ink"
      >
        {children}
      </div>
      <ol
        aria-hidden="true"
        className="col-start-2 grid grid-cols-8 justify-items-center pt-1 text-kicker italic text-ink-soft"
      >
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ol>
    </div>
  )
}
