import { describe, expect, it } from 'vitest'
import {
  groupByYear,
  newAtPlaceHref,
  nextCursor,
  parsePlace,
  placeHref,
  yearSpan,
  type PlaceFresco,
} from './placeHistory'

function row(id: string, year: number, seen = `${year}-01-01T00:00:00Z`): PlaceFresco {
  return {
    id,
    title: id,
    thumb_path: 't',
    composite_path: 'c',
    owner_id: 'o',
    artist: 'Ian',
    seen_at: seen,
    seen_year: year,
    source_fresco_id: null,
    source_title: null,
    source_artist: null,
  }
}

describe('placeHref / parsePlace', () => {
  it('round-trips a place through its URL, name included', () => {
    const href = placeHref({ lat: 14.59953, lng: 120.97805, name: 'Escolta, Manila' })
    expect(href.startsWith('/place?')).toBe(true)
    const params = new URLSearchParams(href.slice(href.indexOf('?')))
    expect(parsePlace(params)).toEqual({ lat: 14.59953, lng: 120.97805, name: 'Escolta, Manila' })
  })

  it('rounds coordinates to about a metre and leaves out an empty name', () => {
    expect(placeHref({ lat: 14.123456789, lng: 121.987654321, name: null })).toBe(
      '/place?lat=14.12346&lng=121.98765',
    )
  })

  it('starts a new underdrawing with the same place query', () => {
    expect(newAtPlaceHref({ lat: 1, lng: 2, name: 'X' })).toBe(
      '/new?lat=1.00000&lng=2.00000&name=X',
    )
  })

  it.each([
    ['', 'missing'],
    ['lat=14.6', 'only one coordinate'],
    ['lat=abc&lng=121', 'not a number'],
    ['lat=91&lng=121', 'latitude off the Earth'],
    ['lat=14.6&lng=-181', 'longitude off the Earth'],
    ['lat=&lng=', 'empty values'],
  ])('rejects %s (%s)', (query) => {
    expect(parsePlace(new URLSearchParams(query))).toBeNull()
  })

  it('treats a blank name as no name', () => {
    expect(parsePlace(new URLSearchParams('lat=1&lng=2&name=%20%20'))?.name).toBeNull()
  })
})

describe('groupByYear', () => {
  it('splits newest-first rows into year sections without reordering them', () => {
    const groups = groupByYear([row('a', 2026), row('b', 2024), row('c', 2024), row('d', 2019)])
    expect(groups.map((g) => [g.year, g.rows.map((r) => r.id)])).toEqual([
      [2026, ['a']],
      [2024, ['b', 'c']],
      [2019, ['d']],
    ])
  })

  it('returns nothing for an empty place', () => {
    expect(groupByYear([])).toEqual([])
  })
})

describe('nextCursor', () => {
  it('points past the last row of a full page', () => {
    const page = [row('a', 2026), row('b', 2025, '2025-06-01T00:00:00Z')]
    expect(nextCursor(page, 2)).toEqual({ seen: '2025-06-01T00:00:00Z', id: 'b' })
  })

  it('is null when the page came back short, so there is nothing more', () => {
    expect(nextCursor([row('a', 2026)], 2)).toBeNull()
  })
})

describe('yearSpan', () => {
  it('reads oldest to newest', () => {
    expect(yearSpan({ years: [2026, 2024, 2019] })).toBe('2019–2026')
  })
  it('is one year when there is only one', () => {
    expect(yearSpan({ years: [2024] })).toBe('2024')
  })
  it('is null for an empty place', () => {
    expect(yearSpan({ years: [] })).toBeNull()
  })
})
