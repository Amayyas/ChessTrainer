import { useState } from 'react'
import { ChessBoard, MoveHistory } from '@/components/Board'
import { Badge, Button, Card, PageHeader } from '@/components/UI'
import { useChessGame } from '@/hooks/useChessGame'
import { describeStatus } from '@/utils/chess'

/**
 * Coach mode — M3 version: a fully playable local board (both sides on one
 * screen) exercising the core chess engine. The Stockfish analysis layer —
 * evaluation bar, best-move arrow, move classification — is added in M4.
 */
export default function CoachPage() {
  const game = useChessGame()
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')

  const statusLabel = describeStatus(game.status, game.turn)
  const statusVariant = game.status.isOver ? 'gold' : game.status.isCheck ? 'danger' : 'neutral'

  return (
    <div>
      <PageHeader
        title="Coach"
        subtitle="Jouez les deux camps sur un plateau libre. L'analyse par IA arrive au module M4."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mx-auto w-full max-w-[560px]">
          <ChessBoard
            fen={game.fen}
            turn={game.turn}
            orientation={orientation}
            onMove={(from, to, promotion) => game.move(from, to, promotion) !== null}
            getLegalTargets={game.getLegalTargets}
            isPromotion={game.isPromotion}
            lastMove={game.lastMove}
            checkSquare={game.checkSquare}
          />
        </div>

        <Card className="flex h-fit flex-col gap-5">
          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-ebene">État de la partie</h2>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-ebene">Coups joués</h2>
            <MoveHistory moves={game.sanHistory} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={game.undo}
              disabled={game.sanHistory.length === 0}
            >
              Annuler
            </Button>
            <Button variant="outline" size="sm" onClick={() => game.reset()}>
              Nouvelle partie
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
            >
              Retourner le plateau
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
