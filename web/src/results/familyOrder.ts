import type { FamilyGroups } from '../pose/families'
import type { Family } from '../pose/families'

export const FAMILY_ORDER: Family[] = ['same_gesture', 'same_upper_body', 'same_lower_body', 'related']

export const FAMILY_LABELS: Record<Family, string> = {
  same_gesture: 'Same gesture',
  same_upper_body: 'Same upper body',
  same_lower_body: 'Same lower body',
  related: 'Related',
}

/** The most specific non-empty family, so the user sees the closest matches first. */
export function pickDefaultFamily<T>(groups: FamilyGroups<T>): Family {
  return FAMILY_ORDER.find((family) => groups[family].length > 0) ?? 'related'
}
