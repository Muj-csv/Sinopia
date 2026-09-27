import type { FamilyGroups } from '../pose/families'
import type { Family } from '../pose/families'
import { FAMILY_LABELS, FAMILY_ORDER } from './familyOrder'

export function FamilyTabs<T>({
  groups,
  active,
  onSelect,
}: {
  groups: FamilyGroups<T>
  active: Family
  onSelect: (family: Family) => void
}) {
  return (
    <div className="family-tabs" role="tablist">
      {FAMILY_ORDER.map((family) => {
        const count = groups[family].length
        return (
          <button
            key={family}
            type="button"
            role="tab"
            aria-selected={active === family}
            className={active === family ? 'active' : ''}
            disabled={count === 0}
            onClick={() => onSelect(family)}
          >
            {FAMILY_LABELS[family]} ({count})
          </button>
        )
      })}
    </div>
  )
}
