/** PHASE-5a task 3 (FR-017): "light rain, 24degC" from Open-Meteo's free, no-key historical API. */
export interface WeatherResult {
  description: string
  tempC: number
}

// WMO weather codes (Open-Meteo's `weathercode`), common subset.
const WEATHER_CODES: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  61: 'light rain',
  63: 'moderate rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'moderate snow',
  75: 'heavy snow',
  80: 'light rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'thunderstorm with heavy hail',
}

export function describeWeatherCode(code: number): string {
  return WEATHER_CODES[code] ?? 'unknown conditions'
}

export function formatWeather(weather: WeatherResult): string {
  return `${weather.description}, ${Math.round(weather.tempC)}°C`
}

export async function fetchWeatherAt(
  lat: number,
  lng: number,
  dateIso: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherResult | null> {
  const date = dateIso.slice(0, 10)
  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
      `&start_date=${date}&end_date=${date}&daily=temperature_2m_max,weathercode&timezone=auto`
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const data = (await res.json()) as {
      daily?: { weathercode?: number[]; temperature_2m_max?: number[] }
    }
    const code = data.daily?.weathercode?.[0]
    const tempC = data.daily?.temperature_2m_max?.[0]
    if (code === undefined || tempC === undefined) return null
    return { description: describeWeatherCode(code), tempC }
  } catch {
    return null
  }
}
