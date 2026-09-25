/** Gesture family tabs with counts (FR-005). */
import type { FamilyKey } from '../pose/families'

const LABELS: Record<FamilyKey, string> = {
  same_gesture: 'Same gesture',
  same_upper_body: 'Same upper body',
  same_lower_body: 'Same lower body',
  related: 'Related',
}

interface Props {
  counts: Record<FamilyKey, number>
  selected: FamilyKey
  onSelect: (key: FamilyKey) => void
}

export function FamilyTabs({ counts, selected, onSelect }: Props) {
  return (
    <div role="tablist" aria-label="Gesture families" className="family-tabs">
      {(Object.keys(LABELS) as FamilyKey[]).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={selected === key}
          className={selected === key ? 'active' : undefined}
          onClick={() => onSelect(key)}
        >
          {LABELS[key]} ({counts[key]})
        </button>
      ))}
    </div>
  )
}
