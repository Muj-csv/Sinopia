import { describe, expect, it, vi } from 'vitest'
import { describeWeatherCode, fetchWeatherAt, formatWeather } from './weather'

describe('describeWeatherCode', () => {
  it('maps known codes', () => {
    expect(describeWeatherCode(0)).toBe('clear sky')
    expect(describeWeatherCode(61)).toBe('light rain')
    expect(describeWeatherCode(95)).toBe('thunderstorm')
  })

  it('falls back for an unknown code', () => {
    expect(describeWeatherCode(9999)).toBe('unknown conditions')
  })
})

describe('formatWeather', () => {
  it('rounds the temperature and joins with the description', () => {
    expect(formatWeather({ description: 'light rain', tempC: 24.4 })).toBe('light rain, 24°C')
  })
})

describe('fetchWeatherAt', () => {
  it('parses the daily arrays into a WeatherResult', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ daily: { weathercode: [61], temperature_2m_max: [24.4] } }),
    })
    const result = await fetchWeatherAt(14.6, 121.05, '2026-09-27T10:00:00Z', fetchImpl)
    expect(result).toEqual({ description: 'light rain', tempC: 24.4 })
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('start_date=2026-09-27'))
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('end_date=2026-09-27'))
  })

  it('returns null on a non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false })
    expect(await fetchWeatherAt(0, 0, '2026-01-01', fetchImpl)).toBeNull()
  })

  it('returns null when the daily data is missing, instead of throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    expect(await fetchWeatherAt(0, 0, '2026-01-01', fetchImpl)).toBeNull()
  })

  it('returns null instead of throwing on a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await fetchWeatherAt(0, 0, '2026-01-01', fetchImpl)).toBeNull()
  })
})
