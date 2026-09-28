/**
 * Formatting for coordinates shown to people (Pin check, Finish, the viewer).
 *
 * Hemisphere letters rather than signs: "15.1450° N" is read correctly by someone who has never
 * thought about which way negative latitude points, and it matches how a map legend writes it.
 * Four decimals is about 11 m, which is finer than the app's own neighbourhood precision.
 */
export const COORD_DECIMALS = 4

export function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(COORD_DECIMALS)}° ${lat < 0 ? 'S' : 'N'}`
}

export function formatLng(lng: number): string {
  return `${Math.abs(lng).toFixed(COORD_DECIMALS)}° ${lng < 0 ? 'W' : 'E'}`
}

/** "15.1450° N, 120.5930° E" */
export function formatCoords(lat: number, lng: number): string {
  return `${formatLat(lat)}, ${formatLng(lng)}`
}
