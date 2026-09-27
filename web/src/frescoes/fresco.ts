/**
 * PHASE-3 tasks 2-4: shared types and pure helpers for the save/publish
 * flow. Storage paths, WKT point formatting, and field validation --
 * kept separate from the Supabase calls (saveFresco.ts etc.) so they're
 * testable without a real client.
 */
export type Visibility = 'private' | 'public'
export type PinPrecision = 'exact' | 'neighborhood'

export const MAX_TITLE = 80
export const MAX_CAPTION = 500
export const MAX_MEMORY = 1000
export const MAX_TAGS = 5
export const MAX_TAG_LENGTH = 24

export interface FinishFields {
  title: string
  caption: string
  memory: string
  tags: string[]
  placeName: string
}

export interface FieldErrors {
  title?: string
  caption?: string
  memory?: string
  tags?: string
  placeName?: string
}

/** Limits mirror the database (DESIGN_BRIEF.md's FinishForm row, docs/schema.sql's check constraints). */
export function validateFinishFields(fields: FinishFields): FieldErrors {
  const errors: FieldErrors = {}
  const title = fields.title.trim()
  if (title === '') errors.title = 'Title is required.'
  else if (title.length > MAX_TITLE)
    errors.title = `Title must be ${MAX_TITLE} characters or fewer.`

  if (fields.caption.length > MAX_CAPTION) {
    errors.caption = `Caption must be ${MAX_CAPTION} characters or fewer.`
  }
  if (fields.memory.length > MAX_MEMORY) {
    errors.memory = `"What I remember" must be ${MAX_MEMORY} characters or fewer.`
  }
  if (fields.tags.length > MAX_TAGS) {
    errors.tags = `Up to ${MAX_TAGS} tags.`
  } else if (fields.tags.some((t) => t.length > MAX_TAG_LENGTH)) {
    errors.tags = `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.`
  }
  if (fields.placeName.length > 200) {
    errors.placeName = 'Place name must be 200 characters or fewer.'
  }

  return errors
}

export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0
}

export type FrescoFile = 'photo' | 'drawing' | 'composite' | 'thumb'

/** ARCHITECTURE.md §7: '<owner_id>/<fresco_id>/<file>.webp' inside each bucket. */
export function frescoPath(ownerId: string, frescoId: string, file: FrescoFile): string {
  return `${ownerId}/${frescoId}/${file}.webp`
}

/** WKT for a PostGIS geography(Point) column -- Postgres/PostGIS casts text implicitly. */
export function pointWkt(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`
}

/**
 * Client-side default matching schema.sql's 'neighborhood' snap (~0.005deg
 * grid, ~550m). The database trigger (sync_public_location) is the source
 * of truth for the actual stored public_location -- this is only used to
 * show the user what "neighborhood" will look like before they publish
 * (DESIGN_BRIEF: "choosing 'exact' shows a one-line warning").
 */
export function snapToNeighborhoodGrid(lat: number, lng: number): { lat: number; lng: number } {
  const grid = 0.005
  return {
    lat: Math.round(lat / grid) * grid,
    lng: Math.round(lng / grid) * grid,
  }
}
