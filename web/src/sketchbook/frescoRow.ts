/** Shape of a `frescoes` row as read back from Supabase (docs/schema.sql). */
import type { PinPrecision, Visibility } from '../frescoes/fresco'

export interface FrescoRow {
  id: string
  owner_id: string
  title: string
  caption: string | null
  memory: string | null
  tags: string[]
  visibility: Visibility
  pin_precision: PinPrecision
  place_name: string | null
  captured_at: string | null
  width: number
  height: number
  photo_path: string
  drawing_path: string
  composite_path: string
  thumb_path: string
  created_at: string
  updated_at: string
  published_at: string | null
}

/** Which heading the Sketchbook shelves are cut by (SCREENS.md: a Place / Month segmented control). */
export type GroupMode = 'place' | 'month'

function monthLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Groups by place_name (falling back to the created month) or by month outright -- UX_MAP:
 * "grouped by place or month". Preserves each group's incoming order
 * (callers sort before grouping).
 */
export function groupFrescoes(
  rows: readonly FrescoRow[],
  mode: GroupMode = 'place',
): { label: string; rows: FrescoRow[] }[] {
  const groups = new Map<string, FrescoRow[]>()
  for (const row of rows) {
    const label =
      mode === 'month' ? monthLabel(row.created_at) : (row.place_name ?? monthLabel(row.created_at))
    const existing = groups.get(label)
    if (existing !== undefined) existing.push(row)
    else groups.set(label, [row])
  }
  return Array.from(groups, ([label, groupRows]) => ({ label, rows: groupRows }))
}
