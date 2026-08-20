import { useState } from 'react'
import { ENGINE_LEVELS, type LevelId } from '@/engine/levels'
import { TIME_CONTROLS, type TimeControlId } from '@/hooks/useChessClock'
import { Button, Card } from '@/components/UI'
import type { BattleConfig, ColorChoice } from '@/features/battle/useBattleGame'
import { cn } from '@/utils/cn'

interface BattleSetupProps {
  onStart: (config: BattleConfig) => void
  /** Engine still loading: the game cannot start yet. */
  disabled?: boolean
}

const COLOR_CHOICES: { value: ColorChoice; label: string; glyph: string }[] = [
  { value: 'white', label: 'Blancs', glyph: '♔' },
  { value: 'black', label: 'Noirs', glyph: '♚' },
  { value: 'random', label: 'Aléatoire', glyph: '⚄' },
]

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
        selected
          ? 'border-or bg-or/15 font-semibold text-ebene'
          : 'border-ebene/15 text-ardoise hover:border-ebene/30 hover:text-ebene',
      )}
    >
      {children}
    </button>
  )
}

/** Pre-game settings: level, colour and time control. */
export default function BattleSetup({ onStart, disabled = false }: BattleSetupProps) {
  const [levelId, setLevelId] = useState<LevelId>(3)
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white')
  const [timeControlId, setTimeControlId] = useState<TimeControlId>('unlimited')

  return (
    <Card className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ebene">Niveau de l'IA</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENGINE_LEVELS.map((level) => (
            <OptionButton
              key={level.id}
              selected={levelId === level.id}
              onClick={() => setLevelId(level.id)}
            >
              <span className="block">
                Niveau {level.id} — {level.label}
              </span>
              <span className="text-xs text-ardoise">
                <span className="font-semibold text-ebene">~{level.elo} Elo</span> ·{' '}
                {level.description}
              </span>
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ebene">Votre couleur</h2>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_CHOICES.map((choice) => (
            <OptionButton
              key={choice.value}
              selected={colorChoice === choice.value}
              onClick={() => setColorChoice(choice.value)}
            >
              <span aria-hidden="true" className="mr-1 text-lg">
                {choice.glyph}
              </span>
              {choice.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ebene">Cadence</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIME_CONTROLS.map((control) => (
            <OptionButton
              key={control.id}
              selected={timeControlId === control.id}
              onClick={() => setTimeControlId(control.id)}
            >
              {control.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        fullWidth
        disabled={disabled}
        onClick={() => onStart({ levelId, colorChoice, timeControlId })}
      >
        {disabled ? "Chargement de l'IA…" : 'Commencer la partie'}
      </Button>
    </Card>
  )
}
