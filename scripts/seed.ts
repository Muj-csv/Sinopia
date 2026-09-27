/**
 * FR-014: seed the globe with the team's demo frescoes so it is never empty
 * during judging (PRD §"Demo safety", risk "Globe looks empty on stage").
 *
 * Runs on a teammate's machine only, with the service-role key -- never in
 * Vercel, never in the repo (docs/SETUP.md, "Never send"). The service role
 * bypasses every RLS policy in docs/schema.sql, which is exactly why this is
 * the one place it is used: it writes rows owned by a seed account without
 * signing in as that account.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.ts
 *
 * Flags:
 *   --dry-run   validate config, manifest and assets; write nothing
 *   --prune     delete seeded frescoes that are no longer in the manifest
 *
 * Re-running is safe: every fresco id is derived from its manifest slug
 * (UUIDv5), so a second run updates the same rows instead of duplicating
 * the globe.
 */
import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = join(HERE, 'seed-assets')
const MANIFEST = join(HERE, 'seed-manifest.json')

/** Fixed namespace so slug -> fresco id is stable across machines and runs. */
const SEED_NAMESPACE = '6f0a9c2e-1d3b-4c5a-8e7f-2b1a4d6c8e90'

const SEED_EMAIL = process.env.SEED_EMAIL ?? 'sinopia-demo@example.com'
const SEED_DISPLAY_NAME = process.env.SEED_DISPLAY_NAME ?? 'Sinopia demo'

const FILES = ['photo', 'drawing', 'composite', 'thumb'] as const
type FrescoFile = (typeof FILES)[number]

interface ManifestEntry {
  slug: string
  title: string
  caption: string
  memory: string
  tags: string[]
  placeName: string
  lat: number
  lng: number
  capturedAt: string
  pinPrecision: 'exact' | 'neighborhood'
  width: number
  height: number
}

/**
 * UUIDv5 (RFC 4122 §4.3): SHA-1 of namespace + name, with the version and
 * variant bits forced. Node has randomUUID (v4) but no v5, and v4 would give
 * a different id on every run -- which would duplicate the whole globe.
 */
function uuidV5(name: string, namespace: string): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex')
  const hash = createHash('sha1').update(nsBytes).update(Buffer.from(name, 'utf8')).digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50 // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  const hex = bytes.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

/** Mirrors web/src/frescoes/fresco.ts -- '<owner>/<fresco>/<file>.webp'. */
function frescoPath(ownerId: string, frescoId: string, file: FrescoFile): string {
  return `${ownerId}/${frescoId}/${file}.webp`
}

function pointWkt(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`
}

/**
 * A real WebP starts 'RIFF' .... 'WEBP'. Checking it here is not pedantry:
 * the only supported way to produce these files is the app's own canvas ->
 * WebP pipeline (web/src/lib/images.ts), which is also what strips EXIF
 * (CLAUDE.md: "every uploaded image goes through the canvas -> WebP pipeline
 * first"). A stray .jpg renamed to .webp would smuggle GPS metadata onto the
 * public globe, so it is rejected rather than uploaded.
 */
function isWebp(buf: Buffer): boolean {
  return (
    buf.length > 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
}

async function loadManifest(): Promise<ManifestEntry[]> {
  const raw = await readFile(MANIFEST, 'utf8')
  const entries = JSON.parse(raw) as ManifestEntry[]
  const slugs = new Set<string>()
  for (const e of entries) {
    if (slugs.has(e.slug)) throw new Error(`Duplicate slug in manifest: ${e.slug}`)
    slugs.add(e.slug)
  }
  return entries
}

interface LoadedAssets {
  entry: ManifestEntry
  files: Record<FrescoFile, Buffer>
}

async function loadAssets(entries: ManifestEntry[]): Promise<LoadedAssets[]> {
  let present: string[] = []
  try {
    present = await readdir(ASSETS_DIR)
  } catch {
    throw new Error(`Missing ${ASSETS_DIR}. See scripts/README.md for how to produce the assets.`)
  }

  const loaded: LoadedAssets[] = []
  const problems: string[] = []

  for (const entry of entries) {
    if (!present.includes(entry.slug)) {
      problems.push(`${entry.slug}: no folder in seed-assets/`)
      continue
    }
    const files = {} as Record<FrescoFile, Buffer>
    for (const file of FILES) {
      const path = join(ASSETS_DIR, entry.slug, `${file}.webp`)
      try {
        const buf = await readFile(path)
        if (!isWebp(buf)) {
          problems.push(`${entry.slug}/${file}.webp: not a WebP file (see scripts/README.md)`)
          continue
        }
        files[file] = buf
      } catch {
        problems.push(`${entry.slug}/${file}.webp: missing`)
      }
    }
    if (FILES.every((f) => files[f] !== undefined)) loaded.push({ entry, files })
  }

  if (problems.length > 0) {
    console.warn(`\n${problems.length} asset problem(s):`)
    for (const p of problems) console.warn(`  - ${p}`)
  }
  return loaded
}

/**
 * The seed account is an ordinary auth user; the handle_new_user trigger in
 * docs/schema.sql creates its profiles row. Looked up by email so re-runs
 * reuse the same owner (and therefore the same storage folder).
 */
async function ensureSeedUser(client: SupabaseClient): Promise<string> {
  const { data: list, error: listError } = await client.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError

  const existing = list.users.find((u) => u.email === SEED_EMAIL)
  if (existing !== undefined) return existing.id

  const { data, error } = await client.auth.admin.createUser({
    email: SEED_EMAIL,
    email_confirm: true,
    password: randomUUID(), // never used: the demo account is not meant to be signed into
    user_metadata: { name: SEED_DISPLAY_NAME },
  })
  if (error) throw error
  if (data.user === null) throw new Error('createUser returned no user')
  return data.user.id
}

async function upload(
  client: SupabaseClient,
  bucket: string,
  path: string,
  body: Buffer,
): Promise<void> {
  const { error } = await client.storage
    .from(bucket)
    .upload(path, body, { cacheControl: '31536000', contentType: 'image/webp', upsert: true })
  if (error) throw error
}

async function seedOne(
  client: SupabaseClient,
  ownerId: string,
  { entry, files }: LoadedAssets,
): Promise<void> {
  const frescoId = uuidV5(entry.slug, SEED_NAMESPACE)
  const paths = Object.fromEntries(
    FILES.map((f) => [f, frescoPath(ownerId, frescoId, f)]),
  ) as Record<FrescoFile, string>

  // Both buckets: sketchbook is the owner's copy, globe is the public copy
  // that publishing would have made (ADR-002).
  for (const file of FILES) {
    await upload(client, 'sketchbook', paths[file], files[file])
    await upload(client, 'globe', paths[file], files[file])
  }

  const { error: frescoError } = await client.from('frescoes').upsert({
    id: frescoId,
    owner_id: ownerId,
    title: entry.title,
    caption: entry.caption,
    memory: entry.memory,
    tags: entry.tags,
    visibility: 'public',
    pin_precision: entry.pinPrecision,
    place_name: entry.placeName,
    captured_at: entry.capturedAt,
    width: entry.width,
    height: entry.height,
    photo_path: paths.photo,
    drawing_path: paths.drawing,
    composite_path: paths.composite,
    thumb_path: paths.thumb,
  })
  if (frescoError) throw frescoError

  // Must come after the fresco row (foreign key), and it is this insert that
  // gives the fresco its public pin: the frescoes trigger runs before any
  // location exists, so sync_public_location leaves public_location null
  // until locations_after_write fires here.
  const { error: locationError } = await client.from('fresco_locations').upsert({
    fresco_id: frescoId,
    owner_id: ownerId,
    location: pointWkt(entry.lat, entry.lng),
  })
  if (locationError) throw locationError
}

async function prune(client: SupabaseClient, ownerId: string, keep: Set<string>): Promise<number> {
  const { data, error } = await client.from('frescoes').select('id').eq('owner_id', ownerId)
  if (error) throw error

  const stale = (data ?? []).map((r) => r.id as string).filter((id) => !keep.has(id))
  for (const id of stale) {
    await client.storage.from('globe').remove(FILES.map((f) => frescoPath(ownerId, id, f)))
    await client.storage.from('sketchbook').remove(FILES.map((f) => frescoPath(ownerId, id, f)))
    const { error: deleteError } = await client.from('frescoes').delete().eq('id', id)
    if (deleteError) throw deleteError
  }
  return stale.length
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const shouldPrune = process.argv.includes('--prune')

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    console.error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see docs/SETUP.md).\n' +
        'The service-role key stays on your machine -- never commit it, never put it in Vercel.',
    )
    process.exit(1)
  }

  const entries = await loadManifest()
  const loaded = await loadAssets(entries)
  console.log(`\n${loaded.length}/${entries.length} frescoes have complete assets.`)

  const cities = new Set(loaded.map((l) => l.entry.placeName.split(', ').slice(-2).join(', ')))
  console.log(`${cities.size} cities: ${[...cities].join(' | ')}`)

  // FR-014 is the acceptance bar, so say plainly whether it is met.
  if (loaded.length < 20 || cities.size < 5) {
    console.warn(
      `\nFR-014 wants >= 20 frescoes across >= 5 cities; this run has ${loaded.length} across ${cities.size}.`,
    )
  }

  if (dryRun) {
    console.log('\n--dry-run: nothing written.')
    return
  }
  if (loaded.length === 0) {
    console.error('\nNo complete frescoes to seed. See scripts/README.md.')
    process.exit(1)
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ownerId = await ensureSeedUser(client)
  console.log(`\nSeed account: ${SEED_EMAIL} (${ownerId})`)

  let done = 0
  for (const item of loaded) {
    await seedOne(client, ownerId, item)
    done += 1
    console.log(`  [${done}/${loaded.length}] ${item.entry.slug}`)
  }

  if (shouldPrune) {
    const keep = new Set(loaded.map((l) => uuidV5(l.entry.slug, SEED_NAMESPACE)))
    const removed = await prune(client, ownerId, keep)
    console.log(`\nPruned ${removed} fresco(es) no longer in the manifest.`)
  }

  console.log(`\nDone. ${done} public frescoes on the globe.`)
}

main().catch((err: unknown) => {
  console.error('\nSeeding failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
