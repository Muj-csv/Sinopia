/**
 * The avatar builder (Update 1.2). One row of choices per part, each row a horizontal strip of
 * pressable swatches -- the same `.option` / `.seg` vocabulary the rest of the app uses, so it
 * reads as part of Sinopia rather than a costume shop bolted on.
 *
 * Every option is available to everyone. There is no "choose your gender" step, by design.
 */
import {
  EXTRAS,
  FACES,
  FRAMES,
  HAIR,
  HAIR_COLORS,
  SKINS,
  WEAR,
  type AvatarConfig,
  type ColorOption,
  type Option,
} from './avatarConfig'
import { Avatar } from './Avatar'

/** A row of colour swatches. Colour alone can't carry the choice, so each has an accessible name. */
function ColorRow({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: ColorOption[]
  value: number
  onChange: (index: number) => void
}) {
  return (
    <fieldset className="avatar-row">
      <legend>{legend}</legend>
      <div className="avatar-swatches">
        {options.map((option, i) => (
          <button
            key={option.label}
            type="button"
            className="avatar-swatch"
            style={{ background: option.value }}
            aria-pressed={i === value}
            onClick={() => onChange(i)}
          >
            <span className="sr-only">{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** A row of named shape choices, shown as words because a tiny shape chip would not read. */
function ShapeRow({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: Option[]
  value: number
  onChange: (index: number) => void
}) {
  return (
    <fieldset className="avatar-row">
      <legend>{legend}</legend>
      <div className="avatar-chips">
        {options.map((option, i) => (
          <button
            key={option.label}
            type="button"
            // ui.css already styles .chip[aria-pressed='true'], so the state needs no extra class.
            className="chip"
            aria-pressed={i === value}
            onClick={() => onChange(i)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function AvatarPicker({
  config,
  onChange,
}: {
  config: AvatarConfig
  onChange: (next: AvatarConfig) => void
}) {
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...config, ...patch })

  return (
    <div className="avatar-picker">
      <div className="avatar-preview">
        <Avatar config={config} size={128} />
      </div>

      <ColorRow
        legend="Skin"
        options={SKINS}
        value={config.skin}
        onChange={(skin) => set({ skin })}
      />
      <ShapeRow
        legend="Hair"
        options={HAIR}
        value={config.hair}
        onChange={(hair) => set({ hair })}
      />
      <ColorRow
        legend="Hair colour"
        options={HAIR_COLORS}
        value={config.hairColor}
        onChange={(hairColor) => set({ hairColor })}
      />
      <ShapeRow
        legend="Expression"
        options={FACES}
        value={config.face}
        onChange={(face) => set({ face })}
      />
      <ShapeRow
        legend="Wearing"
        options={WEAR}
        value={config.wear}
        onChange={(wear) => set({ wear })}
      />
      <ShapeRow
        legend="Detail"
        options={EXTRAS}
        value={config.extra}
        onChange={(extra) => set({ extra })}
      />
      <ColorRow
        legend="Background"
        options={FRAMES}
        value={config.frame}
        onChange={(frame) => set({ frame })}
      />
    </div>
  )
}
