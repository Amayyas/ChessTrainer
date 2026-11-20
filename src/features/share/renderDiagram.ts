import { squaresSvg } from '@/components/Board/boardTheme'
import { brand, fonts, newsprint } from '@/lib/design-tokens'
import type { Color } from '@/utils/chess'
import { FIGURINES, notationParts } from '@/utils/notation'
import { BOARD, HEIGHT, WIDTH, diagramCaption, diagramLayout } from '@/features/share/diagramLayout'

/** The pieces' drawings, by name ('wK', 'bN'…), as URLs the build serves. */
const PIECE_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('@/assets/pieces/mpchess/*.svg', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.split('/').pop()!.replace('.svg', ''), url]),
)

const SERIF = fonts.serif.join(', ')
const FIGURINE = fonts.figurine.join(', ')
const MARGIN = 72

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`could not load ${src.slice(0, 60)}`))
    image.src = src
  })
}

interface Run {
  text: string
  font: string
}

/** Runs of text set side by side, centred as one line on `y`. */
function centredRuns(ctx: CanvasRenderingContext2D, runs: Run[], y: number) {
  const widths = runs.map((run) => {
    ctx.font = run.font
    return ctx.measureText(run.text).width
  })
  let x = (WIDTH - widths.reduce((total, width) => total + width, 0)) / 2
  ctx.textAlign = 'left'
  runs.forEach((run, index) => {
    ctx.font = run.font
    ctx.fillText(run.text, x, y)
    x += widths[index]!
  })
}

/**
 * The faces to load before a word is drawn, as `document.fonts.load` takes
 * them: a canvas does not wait for a font, it falls back. The first family of
 * each stack only — asked for the whole stack, the browser also tries the
 * local fallback faces, and one missing from the machine rejects the load.
 * That rejection once cost every player their image.
 */
export function fontsToLoad(): Array<[font: string, text?: string]> {
  const [serif, figurine] = [fonts.serif[0], fonts.figurine[0]]
  return [
    [`700 88px ${serif}`],
    [`italic 400 38px ${serif}`],
    [`600 28px ${serif}`],
    [`38px ${figurine}`, Object.values(FIGURINES).join('')],
  ]
}

export interface DiagramRequest {
  fen: string
  orientation: Color
  /** The move that led to the position, if there was one, and the position it was played in. */
  lastMove: { san: string; before: string } | null
}

/**
 * The position as a printed diagram, a PNG: the nameplate over the double
 * rule, the board as the site draws it — hatched dark squares, the same
 * pieces — its caption in the column's words, and where to find the site.
 * Always the day edition: a picture sent away is printed on paper.
 */
export async function renderDiagram({ fen, orientation, lastMove }: DiagramRequest): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2D canvas here')

  const layout = diagramLayout(fen, orientation)
  const caption = diagramCaption(fen, lastMove)
  const squares = `data:image/svg+xml,${encodeURIComponent(squaresSvg('hatched'))}`
  const names = [...new Set(layout.pieces.map((placed) => placed.piece))]
  // Settled, not all-or-nothing: a face that will not load leaves the text in
  // the fallback, not the player without an image.
  await Promise.allSettled(fontsToLoad().map(([font, text]) => document.fonts.load(font, text)))
  const [board, ...drawings] = await Promise.all([
    loadImage(squares),
    ...names.map((name) => loadImage(PIECE_URLS[name]!)),
  ])
  const drawing = Object.fromEntries(names.map((name, index) => [name, drawings[index]!]))

  const { paper, ink } = newsprint
  ctx.fillStyle = paper.DEFAULT
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = ink.DEFAULT
  ctx.textBaseline = 'alphabetic'

  // The nameplate, over the double rule.
  ctx.font = `700 88px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.fillText(brand.name, WIDTH / 2, 150)
  ctx.fillRect(MARGIN, 186, WIDTH - 2 * MARGIN, 4)
  ctx.fillRect(MARGIN, 197, WIDTH - 2 * MARGIN, 1.5)

  // The diagram in its double frame, as BoardFrame draws it.
  ctx.drawImage(board!, BOARD.x, BOARD.y, BOARD.size, BOARD.size)
  for (const placed of layout.pieces) {
    ctx.drawImage(drawing[placed.piece]!, placed.x, placed.y, placed.size, placed.size)
  }
  ctx.strokeStyle = ink.DEFAULT
  ctx.lineWidth = 4
  ctx.strokeRect(BOARD.x - 2, BOARD.y - 2, BOARD.size + 4, BOARD.size + 4)
  ctx.lineWidth = 1.5
  ctx.strokeRect(BOARD.x - 10, BOARD.y - 10, BOARD.size + 20, BOARD.size + 20)

  ctx.fillStyle = ink.soft
  ctx.font = `italic 400 26px ${SERIF}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'
  for (const label of layout.ranks) ctx.fillText(label.text, label.x, label.y)
  ctx.textAlign = 'center'
  for (const label of layout.files) ctx.fillText(label.text, label.x, label.y)

  // The caption: "Diagramme · Les Noirs jouent. Après 5.♘g5."
  ctx.fillStyle = ink.DEFAULT
  ctx.textBaseline = 'alphabetic'
  const italic = `italic 400 38px ${SERIF}`
  const runs: Run[] = [
    { text: 'Diagramme', font: `700 38px ${SERIF}` },
    { text: ' · ', font: `400 38px ${SERIF}` },
    { text: caption.sentence, font: italic },
  ]
  if (caption.lastMove) {
    runs.push({ text: ` Après ${caption.lastMove.number}`, font: italic })
    for (const part of notationParts(caption.lastMove.san)) {
      runs.push(
        'piece' in part
          ? { text: FIGURINES[part.piece], font: `38px ${FIGURINE}` }
          : { text: part.text, font: italic },
      )
    }
    runs.push({ text: '.', font: italic })
  }
  centredRuns(ctx, runs, 1180)

  // Where to find the site, under a hairline.
  ctx.fillRect(MARGIN, 1236, WIDTH - 2 * MARGIN, 1.5)
  ctx.font = `600 28px ${SERIF}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px'
  ctx.textAlign = 'center'
  ctx.fillText(brand.domain.toUpperCase(), WIDTH / 2, 1294)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('the canvas gave no image'))),
      'image/png',
    ),
  )
}
