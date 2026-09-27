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

/**
 * Groups by place_name (falling back to the created month) -- UX_MAP:
 * "grouped by place or month". Preserves each group's incoming order
 * (callers sort before grouping).
 */
export function groupFrescoes(rows: readonly FrescoRow[]): { label: string; rows: FrescoRow[] }[] {
  const groups = new Map<string, FrescoRow[]>()
  for (const row of rows) {
    const label =
      row.place_name ??
      new Date(row.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const existing = groups.get(label)
    if (existing !== undefined) existing.push(row)
    else groups.set(label, [row])
  }
  return Array.from(groups, ([label, groupRows]) => ({ label, rows: groupRows }))
}
