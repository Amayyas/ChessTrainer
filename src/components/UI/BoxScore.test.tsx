import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BoxScore from '@/components/UI/BoxScore'

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : []
  })
}

describe('BoxScore', () => {
  it('pairs each figure with its name, the name first for assistive tech', () => {
    render(
      <BoxScore
        figures={[
          { label: 'Temps', value: '12 s' },
          { label: 'Erreurs', value: 0 },
        ]}
      />,
    )
    const names = screen.getAllByRole('term').map((term) => term.textContent)
    const values = screen.getAllByRole('definition').map((value) => value.textContent)
    expect(names).toEqual(['Temps', 'Erreurs'])
    expect(values).toEqual(['12 s', '0'])
  })

  it('sets a figure that needs attention now in the rubric, and only that one', () => {
    render(
      <BoxScore
        figures={[
          { label: 'Temps', value: '8 s', urgent: true },
          { label: 'Score', value: 40 },
        ]}
      />,
    )
    expect(screen.getByText('8 s')).toHaveClass('text-rubric')
    expect(screen.getByText('40')).not.toHaveClass('text-rubric')
  })

  it('sets as many figures to a row as it has, up to four, unless told otherwise', () => {
    // The puzzle's score once took its row from its figures; a count restated by
    // every caller would let a fourth figure wrap under a stray rule.
    const figures = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ label: `F${i}`, value: i }))
    const grid = (props: Parameters<typeof BoxScore>[0]) => {
      const { container, unmount } = render(<BoxScore {...props} />)
      const classes = container.querySelector('dl')!.className
      unmount()
      return classes
    }
    expect(grid({ figures: figures(3) })).toContain('sm:grid-cols-3')
    expect(grid({ figures: figures(4) })).toContain('sm:grid-cols-4')
    expect(grid({ figures: figures(6) })).toContain('sm:grid-cols-4')
    expect(grid({ figures: figures(6), columns: 3 })).toContain('sm:grid-cols-3')
  })

  it('is the only place a box score is written', () => {
    // Five hand-written copies each picked their own figure size, padding and
    // way of ruling the columns. A figure over its name, as a description
    // list turned upside down, is now this component's alone.
    const handWritten = sources(resolve('src'))
      .filter((path) => !path.endsWith('BoxScore.tsx'))
      .filter((path) => {
        const source = readFileSync(path, 'utf8')
        return source.includes('<dt') && source.includes('flex-col-reverse')
      })
    expect(handWritten).toEqual([])
  })
})
