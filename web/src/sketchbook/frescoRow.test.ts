import { describe, expect, it } from 'vitest'
import { groupFrescoes, type FrescoRow } from './frescoRow'

function row(overrides: Partial<FrescoRow> = {}): FrescoRow {
  return {
    id: 'f1',
    owner_id: 'u1',
    title: 'Untitled',
    caption: null,
    memory: null,
    tags: [],
    visibility: 'private',
    pin_precision: 'neighborhood',
    place_name: null,
    captured_at: null,
    width: 100,
    height: 100,
    photo_path: 'u1/f1/photo.webp',
    drawing_path: 'u1/f1/drawing.webp',
    composite_path: 'u1/f1/composite.webp',
    thumb_path: 'u1/f1/thumb.webp',
    created_at: '2026-09-27T00:00:00.000Z',
    updated_at: '2026-09-27T00:00:00.000Z',
    published_at: null,
    ...overrides,
  }
}

describe('groupFrescoes', () => {
  it('groups rows sharing the same place name together', () => {
    const groups = groupFrescoes([
      row({ id: 'a', place_name: 'Rizal Park' }),
      row({ id: 'b', place_name: 'Intramuros' }),
      row({ id: 'c', place_name: 'Rizal Park' }),
    ])
    expect(groups).toHaveLength(2)
    const rizal = groups.find((g) => g.label === 'Rizal Park')
    expect(rizal?.rows.map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('falls back to month/year when place_name is null', () => {
    const groups = groupFrescoes([
      row({ place_name: null, created_at: '2026-03-15T00:00:00.000Z' }),
    ])
    expect(groups[0].label).toBe('March 2026')
  })

  it('returns an empty array for no rows', () => {
    expect(groupFrescoes([])).toEqual([])
  })
})
