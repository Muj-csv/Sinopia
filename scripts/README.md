# Seeding the demo globe (FR-014)

The globe must never look empty on stage. `seed.ts` uploads the team's demo
frescoes to the real Supabase project as public frescoes owned by one seed
account.

## What you need

1. **Node 22.22.2+ / 24.15.0+** (same as `web/`; the script is TypeScript and
   relies on Node's built-in type stripping).
2. `npm install` at the repo root (installs `@supabase/supabase-js`).
3. The **service-role key**, from Supabase → Settings → API.
   It stays on your machine: never commit it, never put it in Vercel, never
   paste it into a chat. It bypasses every RLS policy in `docs/schema.sql`,
   which is why it is the only way to write rows owned by an account you are
   not signed in as.
4. `supabase/migrations/0001_init.sql` already applied to the project — the
   script writes to `frescoes`, `fresco_locations` and both storage buckets.

## The artwork

Each fresco needs a folder named after its manifest `slug`:

```
scripts/seed-assets/<slug>/
  photo.webp      the real photograph
  drawing.webp    the drawing layer alone, transparent
  composite.webp  photo + drawing, flattened
  thumb.webp      400 px version of the composite
```

**These must be real WebP files produced by the app itself.** Make the fresco
in Sinopia and save it, then download the four files from the `sketchbook`
bucket — that guarantees they went through `web/src/lib/images.ts`, which is
also what strips EXIF (including GPS) from the photograph. The script checks
the WebP magic bytes and refuses anything else, so renaming a `.jpg` will not
work; that check exists to stop a photo's GPS metadata reaching the public
globe.

## The metadata

`seed-manifest.json` holds 24 frescoes across 6 cities (Angeles City, Manila,
Tokyo, Barcelona, Lisbon, Mexico City). Coordinates are public streets and
landmarks, never anyone's home.

**The titles, captions and "what I remember" lines in it are scaffolding.**
Replace them with the real text for the frescoes the team actually draws —
they are shown to judges.

`pinPrecision` is `neighborhood` for most entries (the privacy default,
D-007). Five landmark spots use `exact` so the demo can show the street-level
panel, which is deliberately hidden for neighborhood frescoes (FR-015).

## Running it

```bash
# Check config, manifest and assets without writing anything:
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  node scripts/seed.ts --dry-run

# Seed for real:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.ts

# Also delete seeded frescoes that are no longer in the manifest:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.ts --prune
```

On Windows PowerShell, set the variables first:

```powershell
$env:SUPABASE_URL = "https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
node scripts/seed.ts --dry-run
```

Re-running is safe. Each fresco id is a UUIDv5 of its slug, so a second run
updates the same rows rather than duplicating the globe.

## Notes

- The seed account (`sinopia-demo@example.com`, override with `SEED_EMAIL`) is
  created with a random password that is thrown away — it exists to own the
  demo rows, not to be signed into.
- Frescoes are written straight to `visibility: 'public'`, and both buckets get
  a copy, which is the state `publishFresco()` would have left them in.
- `public_location` is never written by this script. The database derives it,
  the same as for a real publish (ADR-003).
