import { useId, useState, type ReactNode } from 'react'
import { ENGINE_LEVELS, type LevelId } from '@/engine/levels'
import { TIME_CONTROLS, type TimeControlId } from '@/hooks/useChessClock'
import { Box, Button } from '@/components/UI'
import Notation from '@/components/UI/Notation'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
import type { Resume } from '@/features/battle/resume'
import { moveNumberIn } from '@/utils/notation'
import type { BattleConfig, ColorChoice } from '@/features/battle/useBattleGame'

interface BattleSetupProps {
  onStart: (config: BattleConfig) => void
  /** Engine still loading: the game cannot start yet. */
  disabled?: boolean
  /** A position taken up from the coach, to play from instead of the opening one. */
  resume?: Resume | null
  /** Drops the resume, for a game from the opening position. */
  onDropResume?: () => void
}

/**
 * The kings stand for the two colours. Random has no figure: the die it used
 * to carry is no chess sign, and the figurine face does not hold one.
 */
const COLOR_CHOICES: { value: ColorChoice; label: string; glyph?: string }[] = [
  { value: 'white', label: 'Blancs', glyph: '♔' },
  { value: 'black', label: 'Noirs', glyph: '♚' },
  { value: 'random', label: 'Aléatoire' },
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
      <h2 id={headingId} className="mb-3 text-kicker font-semibold uppercase">
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

/**
 * Pre-game settings: level, colour and time control.
 *
 * With a resume, the game starts from the position before the mistake, and the
 * colour is not a choice: the player takes again the side that went wrong. The
 * level starts on the one the game was played at, when it is known.
 */
export default function BattleSetup({
  onStart,
  disabled = false,
  resume = null,
  onDropResume,
}: BattleSetupProps) {
  const [levelId, setLevelId] = useState<LevelId>(resume?.levelId ?? 3)
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white')
  const [timeControlId, setTimeControlId] = useState<TimeControlId>('unlimited')
  const [board, setBoard] = useState<'visible' | 'blind'>('visible')

  const start = () =>
    onStart(
      resume
        ? {
            levelId,
            colorChoice: resume.color === 'w' ? 'white' : 'black',
            timeControlId,
            startFen: resume.fen,
            blindfold: board === 'blind',
          }
        : { levelId, colorChoice, timeControlId, blindfold: board === 'blind' },
    )

  return (
    <Box className="mx-auto flex max-w-xl flex-col gap-6">
      {resume && (
        <section aria-labelledby="t-resume">
          <h2 id="t-resume" className="mb-1 text-kicker font-semibold uppercase">
            Reprise
          </h2>
          <p className="text-body">
            La partie reprend juste avant {moveNumberIn(resume.fen)}
            <Notation san={resume.san} />, avec les {resume.color === 'w' ? 'blancs' : 'noirs'}.
            Trouvez mieux.
          </p>
          <p className="mt-1 text-caption italic text-ink-soft">
            Une partie reprise sert à s’entraîner : elle ne compte pas pour la progression.
          </p>
          <Button variant="quiet" size="sm" className="mt-1.5" onClick={onDropResume}>
            Partir de la position initiale
          </Button>
        </section>
      )}

      <Setting
        title="Niveau de l'IA"
        value={String(levelId)}
        onChange={(next) => setLevelId(Number(next) as LevelId)}
        className="sm:grid-cols-2"
      >
        {ENGINE_LEVELS.map((level) => (
          // Set from the top, so the level names line up across a row whose
          // descriptions run to different lengths.
          <ToggleGroupItem
            key={level.id}
            value={String(level.id)}
            className="flex flex-col items-start justify-start"
          >
            <span className="block">
              Niveau {level.id} — {level.label}
            </span>
            <span className="text-caption opacity-80">
              <span className="font-semibold tabular-nums lining-nums">~{level.elo} Elo</span> ·{' '}
              {level.description}
            </span>
          </ToggleGroupItem>
        ))}
      </Setting>

      {!resume && (
        <Setting
          title="Votre couleur"
          value={colorChoice}
          onChange={setColorChoice}
          className="grid-cols-3"
        >
          {COLOR_CHOICES.map((choice) => (
            <ToggleGroupItem key={choice.value} value={choice.value}>
              {choice.glyph && (
                <span
                  aria-hidden="true"
                  className="mr-1.5 font-figurine text-[1.125rem] leading-none"
                >
                  {choice.glyph}
                </span>
              )}
              {choice.label}
            </ToggleGroupItem>
          ))}
        </Setting>
      )}

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

      <div>
        <Setting title="Plateau" value={board} onChange={setBoard} className="grid-cols-2">
          <ToggleGroupItem value="visible">Visible</ToggleGroupItem>
          <ToggleGroupItem value="blind">À l’aveugle</ToggleGroupItem>
        </Setting>
        {board === 'blind' && (
          <p className="mt-2 text-caption italic text-ink-soft">
            Le plateau est masqué : vous suivez la partie de tête, voyez le dernier coup joué, et
            jouez en tapant vos coups. Il réapparaît à la fin de la partie.
          </p>
        )}
      </div>

      <Button size="lg" fullWidth disabled={disabled} onClick={start}>
        {disabled ? "Chargement de l'IA…" : resume ? 'Reprendre la partie' : 'Commencer la partie'}
      </Button>
    </Box>
  )
}
