import { useId, useState, type ReactNode } from 'react'
import { ENGINE_LEVELS, type LevelId } from '@/engine/levels'
import { TIME_CONTROLS, type TimeControlId } from '@/hooks/useChessClock'
import { Button, Card } from '@/components/UI'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
import type { BattleConfig, ColorChoice } from '@/features/battle/useBattleGame'

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

/**
 * One setting: a heading, and the group of choices it names.
 *
 * The heading labels the group through aria-labelledby rather than merely
 * sitting above it. Before, a screen reader met three unnamed collections of
 * pressed buttons, and which setting it was in was prose beside them.
 */
function Setting<T extends string>({
  title,
  value,
  onChange,
  className,
  children,
}: {
  title: string
  value: T
  onChange: (value: T) => void
  className?: string
  children: ReactNode
}) {
  const headingId = useId()

  return (
    <div>
      <h2 id={headingId} className="mb-3 font-display text-lg font-bold text-foreground">
        {title}
      </h2>
      <ToggleGroup
        type="single"
        variant="plain"
        value={value}
        // A setting has no empty state, and Radix would give it one: pressing
        // the option already on deselects it. The colour would become neither
        // white nor black, and the game would start on whatever that means.
        onValueChange={(next) => {
          if (next) onChange(next as T)
        }}
        aria-labelledby={headingId}
        className={className}
      >
        {children}
      </ToggleGroup>
    </div>
  )
}

/** Pre-game settings: level, colour and time control. */
export default function BattleSetup({ onStart, disabled = false }: BattleSetupProps) {
  const [levelId, setLevelId] = useState<LevelId>(3)
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white')
  const [timeControlId, setTimeControlId] = useState<TimeControlId>('unlimited')

  return (
    <Card className="mx-auto flex max-w-xl flex-col gap-6">
      <Setting
        title="Niveau de l'IA"
        value={String(levelId)}
        onChange={(next) => setLevelId(Number(next) as LevelId)}
        className="sm:grid-cols-2"
      >
        {ENGINE_LEVELS.map((level) => (
          <ToggleGroupItem key={level.id} value={String(level.id)}>
            <span className="block">
              Niveau {level.id} — {level.label}
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">~{level.elo} Elo</span> ·{' '}
              {level.description}
            </span>
          </ToggleGroupItem>
        ))}
      </Setting>

      <Setting
        title="Votre couleur"
        value={colorChoice}
        onChange={setColorChoice}
        className="grid-cols-3"
      >
        {COLOR_CHOICES.map((choice) => (
          <ToggleGroupItem key={choice.value} value={choice.value}>
            <span aria-hidden="true" className="mr-1 text-lg">
              {choice.glyph}
            </span>
            {choice.label}
          </ToggleGroupItem>
        ))}
      </Setting>

      <Setting
        title="Cadence"
        value={timeControlId}
        onChange={setTimeControlId}
        className="sm:grid-cols-2"
      >
        {TIME_CONTROLS.map((control) => (
          <ToggleGroupItem key={control.id} value={control.id}>
            {control.label}
          </ToggleGroupItem>
        ))}
      </Setting>

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
