import { describe, expect, it } from 'vitest'
import { formatScope, formatTimeRemaining, isMissionOpenNow } from './missionDisplay'

describe('formatScope', () => {
  it('labels global and regional missions plainly', () => {
    expect(formatScope({ missionType: 'global', radiusMeters: null })).toBe('Global')
    expect(formatScope({ missionType: 'regional', radiusMeters: null })).toBe('Regional')
  })

  it('shows the radius in meters under 1km', () => {
    expect(formatScope({ missionType: 'radius', radiusMeters: 500 })).toBe('Within 500 m')
  })

  it('shows the radius in whole kilometers when it divides evenly', () => {
    expect(formatScope({ missionType: 'radius', radiusMeters: 2000 })).toBe('Within 2 km')
  })

  it('shows one decimal for a non-round kilometer radius', () => {
    expect(formatScope({ missionType: 'radius', radiusMeters: 1500 })).toBe('Within 1.5 km')
  })

  it('falls back to "Nearby" for a radius mission with no radius set', () => {
    expect(formatScope({ missionType: 'radius', radiusMeters: null })).toBe('Nearby')
  })

  it('labels place and fresco missions', () => {
    expect(formatScope({ missionType: 'place', radiusMeters: null })).toBe('This place')
    expect(formatScope({ missionType: 'fresco', radiusMeters: null })).toBe('Answer this fresco')
  })
})

describe('formatTimeRemaining', () => {
  const now = new Date('2026-10-02T12:00:00Z')

  it('returns null when a mission has no end date', () => {
    expect(formatTimeRemaining({ startsAt: null, endsAt: null }, now)).toBeNull()
  })

  it('says Ended once the end date has passed', () => {
    expect(formatTimeRemaining({ startsAt: null, endsAt: '2026-10-01T00:00:00Z' }, now)).toBe(
      'Ended',
    )
  })

  it('shows hours remaining under 48h', () => {
    expect(formatTimeRemaining({ startsAt: null, endsAt: '2026-10-03T06:00:00Z' }, now)).toBe(
      'Ends in 18h',
    )
  })

  it('shows days remaining at 48h or more', () => {
    expect(formatTimeRemaining({ startsAt: null, endsAt: '2026-10-07T12:00:00Z' }, now)).toBe(
      'Ends in 5d',
    )
  })

  it('shows a starts-in message for a mission that has not started yet', () => {
    expect(formatTimeRemaining({ startsAt: '2026-10-05T12:00:00Z', endsAt: null }, now)).toBe(
      'Starts in 3d',
    )
  })
})

describe('isMissionOpenNow', () => {
  const now = new Date('2026-10-02T12:00:00Z')

  it('is open when active with no window', () => {
    expect(isMissionOpenNow({ status: 'active', startsAt: null, endsAt: null }, now)).toBe(true)
  })

  it('is closed when not active', () => {
    expect(isMissionOpenNow({ status: 'closed', startsAt: null, endsAt: null }, now)).toBe(false)
    expect(isMissionOpenNow({ status: 'draft', startsAt: null, endsAt: null }, now)).toBe(false)
  })

  it('is closed before its start time', () => {
    expect(
      isMissionOpenNow({ status: 'active', startsAt: '2026-10-05T00:00:00Z', endsAt: null }, now),
    ).toBe(false)
  })

  it('is closed after its end time', () => {
    expect(
      isMissionOpenNow({ status: 'active', startsAt: null, endsAt: '2026-10-01T00:00:00Z' }, now),
    ).toBe(false)
  })

  it('is open within its window', () => {
    expect(
      isMissionOpenNow(
        { status: 'active', startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-05T00:00:00Z' },
        now,
      ),
    ).toBe(true)
  })
})
