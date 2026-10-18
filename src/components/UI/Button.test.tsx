import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button, { type ButtonVariant } from '@/components/UI/Button'

// Every variant, checked against the component's own map by the type: a
// variant added to Button.tsx and missing here fails the typecheck, so the
// loops below cannot quietly skip it.
const VARIANTS = Object.keys({
  primary: true,
  secondary: true,
  quiet: true,
} satisfies Record<ButtonVariant, true>) as ButtonVariant[]

/** The class tokens a variant renders with. */
function classesOf(variant: ButtonVariant): string[] {
  const { unmount } = render(<Button variant={variant}>Jouer</Button>)
  const classes = screen.getByRole('button', { name: 'Jouer' }).className.split(/\s+/)
  unmount()
  return classes
}

describe('Button', () => {
  it('renders its label and defaults to type="button"', () => {
    render(<Button>Jouer</Button>)
    const button = screen.getByRole('button', { name: 'Jouer' })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('fires onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Valider</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled and announces busy while loading', () => {
    render(<Button isLoading>Charger</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('lends its styling to the child element when asChild is set', async () => {
    render(
      <Button asChild variant="secondary">
        <a href="/jouer">Jouer</a>
      </Button>,
    )

    // The point of asChild: one element, an anchor, wearing the button. A
    // button wrapping a link would be two controls in the accessibility tree
    // and invalid HTML besides.
    const link = screen.getByRole('link', { name: 'Jouer' })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(link).toHaveAttribute('data-variant', 'secondary')
  })

  it('keeps form-control attributes off the element asChild renders', () => {
    render(
      <Button asChild>
        <a href="/jouer">Jouer</a>
      </Button>,
    )

    // `type` and `disabled` belong to form controls. Spelled onto an anchor
    // they mean nothing, and React warns on the boolean one.
    const link = screen.getByRole('link', { name: 'Jouer' })
    expect(link).not.toHaveAttribute('type')
    expect(link).not.toHaveAttribute('disabled')
  })

  it('names its variant and size, primary and medium by default', () => {
    render(<Button>Jouer</Button>)
    const button = screen.getByRole('button', { name: 'Jouer' })
    expect(button).toHaveAttribute('data-variant', 'primary')
    expect(button).toHaveAttribute('data-size', 'md')
  })

  it('draws every variant square, flat and still', () => {
    // The newsprint rules: no rounded corner, no shadow, and nothing that lifts
    // or shrinks under the pointer. A class that brings one back fails here.
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Jouer</Button>)
      const classes = screen.getByRole('button', { name: 'Jouer' }).className
      expect(classes, variant).not.toMatch(/\brounded-(?!none)/)
      expect(classes, variant).not.toMatch(/\bshadow-/)
      expect(classes, variant).not.toMatch(/(scale|translate)-/)
      unmount()
    }
  })

  it('turns some of its ink to the rubric under the pointer, in every variant', () => {
    // A change of ground alone is not a hover: inside a box, the ground a
    // button turns to is the box's own paper, and nothing on screen moves.
    for (const variant of VARIANTS) {
      expect(classesOf(variant), variant).toContainEqual(
        expect.stringMatching(/^hover:(bg|text|border)-rubric$/),
      )
    }
  })

  it('swaps every colour on a dark surface, at rest and under the pointer', () => {
    // The ebony bands the pages still carry are marked .theme-inverse. A colour
    // with no rule for them is drawn there as it is on the page: ink on ebony
    // at rest, the rubric on ebony under the pointer — present, and illegible.
    // So each colour a variant sets, in each state, needs its inverse twin.
    const colour = /^(hover:)?(bg|text|border)-(ink|paper|rubric)\b/
    for (const variant of VARIANTS) {
      const classes = classesOf(variant)
      const inverse = classes.filter((c) => c.startsWith('[.theme-inverse_&]:'))
      for (const match of classes.map((c) => colour.exec(c)).filter((m) => m !== null)) {
        const [, state = '', property] = match
        expect(inverse, `${variant}: ${match[0]}`).toContainEqual(
          expect.stringMatching(new RegExp(`^\\[\\.theme-inverse_&\\]:${state}${property}-`)),
        )
      }
    }
  })

  it('changes more than a shade of paper under the pointer, on a dark surface', () => {
    // On ebony a button is drawn in the papers, and two of them side by side
    // cannot be told apart: paper to bright paper is 1.08:1. So each variant's
    // dark hover has to bring in another colour, or another weight of line.
    const papers = /:hover:(bg|text|border)-paper(-bright|-deep)?(\/\d+)?$/
    for (const variant of VARIANTS) {
      const hover = classesOf(variant).filter((c) => c.startsWith('[.theme-inverse_&]:hover:'))
      expect(hover, variant).toContainEqual(expect.not.stringMatching(papers))
    }
  })

  it('wraps a long label instead of letting it overflow', () => {
    // Tracked capitals run wide: at 320 px, three labels measured wider than
    // the column a box leaves them. A label that cannot wrap leaves its button,
    // and a fixed height would clip one that does.
    for (const variant of VARIANTS) {
      const classes = classesOf(variant)
      expect(classes, variant).not.toContain('whitespace-nowrap')
      expect(classes, variant).not.toContainEqual(expect.stringMatching(/^h-/))
    }
  })

  it('makes a disabled asChild button inert, not merely labelled as one', async () => {
    const onClick = vi.fn()
    render(
      <Button asChild disabled>
        <a href="/jouer" onClick={onClick}>
          Jouer
        </a>
      </Button>,
    )

    // `disabled:` never matches on an anchor, so the styling that stops a real
    // button did nothing here: the link announced itself disabled and navigated
    // anyway, on click and on Enter.
    const link = screen.getByRole('link', { name: 'Jouer' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveClass('pointer-events-none')
  })

  it('lets a later className override a variant class', () => {
    render(<Button className="bg-rubric">Jouer</Button>)

    // The reason cn() uses tailwind-merge. Joined by hand the element would
    // carry bg-ink and bg-rubric at once, and the winner would be whichever
    // rule Tailwind emitted last rather than the caller's.
    const button = screen.getByRole('button', { name: 'Jouer' })
    expect(button).toHaveClass('bg-rubric')
    expect(button).not.toHaveClass('bg-ink')
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Bloqué
      </Button>,
    )
    await userEvent.click(screen.getByRole('button')).catch(() => {})
    expect(onClick).not.toHaveBeenCalled()
  })
})
