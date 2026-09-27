/**
 * Checks whether the Openverse client in web/.env.local works, and whether it
 * has been verified.
 *
 *   node scripts/check-openverse.mjs
 *
 * Verification matters: an unverified client authenticates fine but keeps the
 * anonymous throttle (20/min, 200/day), which is what breaks a live demo when
 * several people search at once. The only reliable signal is the rate-limit
 * headers Openverse returns on a real search -- so this makes one.
 *
 * Prints status and limits only, never the credentials or the access token.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', '.env.local')
const TOKEN_URL = 'https://api.openverse.org/v1/auth_tokens/token/'
const SEARCH_URL = 'https://api.openverse.org/v1/images/'

/** Anonymous ceiling, per Openverse's documented throttle tiers. */
const ANON_BURST = 20

function readEnvValue(contents, key) {
  const match = contents.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : ''
}

const env = await readFile(ENV_PATH, 'utf8')
const clientId = readEnvValue(env, 'OPENVERSE_CLIENT_ID')
const clientSecret = readEnvValue(env, 'OPENVERSE_CLIENT_SECRET')

if (!clientId || !clientSecret) {
  console.error('OPENVERSE_CLIENT_ID / OPENVERSE_CLIENT_SECRET missing from web/.env.local.')
  console.error('Run: node scripts/register-openverse.mjs you@example.com')
  process.exit(1)
}

const tokenRes = await fetch(TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
})

if (!tokenRes.ok) {
  console.error(`\nToken request failed: ${tokenRes.status} ${tokenRes.statusText}`)
  console.error(await tokenRes.text())
  console.error('\nThe credentials themselves are wrong or revoked -- re-register.')
  process.exit(1)
}

const { access_token: accessToken, expires_in: expiresIn } = await tokenRes.json()
console.log(`\nCredentials accepted. Token valid for ${Math.round(expiresIn / 3600)}h.`)

/**
 * Judge the authenticated response on its own. Comparing it against an
 * anonymous request looks tempting but is unsound: Openverse sits behind a
 * CDN, so an anonymous search can be served a cached response carrying the
 * throttle headers of an earlier authenticated one. The cache buster keeps
 * this request from being answered out of that same cache.
 */
const res = await fetch(`${SEARCH_URL}?q=fire+hydrant&page_size=1&_=${Date.now()}`, {
  headers: { Authorization: `Bearer ${accessToken}` },
})

const limits = {}
for (const [key, value] of res.headers) {
  if (key.toLowerCase().startsWith('x-ratelimit-limit-')) {
    limits[key.toLowerCase().replace('x-ratelimit-limit-', '')] = value
  }
}

console.log(`Search: ${res.status} ${res.statusText}`)
console.log('Reported limits:', JSON.stringify(limits))

// An oauth2_* scope at all means the request was throttled as an authenticated
// client rather than an anonymous one. Fall back to comparing the burst number
// against the anonymous ceiling if the scope names ever change.
const oauthKey = Object.keys(limits).find((k) => k.startsWith('oauth2'))
const burstValue = Object.entries(limits).find(([k]) => k.endsWith('burst'))?.[1]
const burst = Number.parseInt(burstValue ?? '', 10)

if (oauthKey || (Number.isFinite(burst) && burst > ANON_BURST)) {
  console.log('\nVERIFIED: on the authenticated tier, above the anonymous ceiling.')
} else if (Object.keys(limits).length > 0) {
  console.log(`\nNOT VERIFIED: still on the anonymous ceiling (${ANON_BURST}/min, 200/day).`)
  console.log('The client authenticates, but will throttle under demo load.')
  console.log('Re-register and click the new verification link exactly once.')
} else {
  console.log('\nINCONCLUSIVE: no throttle headers returned. Re-run in a minute.')
  console.log('Do not read this as either verified or not.')
}
