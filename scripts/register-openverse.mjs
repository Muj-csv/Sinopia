/**
 * Registers an Openverse API client and writes the credentials into
 * web/.env.local, which is gitignored.
 *
 *   node scripts/register-openverse.mjs you@example.com
 *
 * It deliberately never prints the client secret -- only a masked
 * confirmation -- so it is safe to run anywhere, including inside a shared
 * terminal session. Read the values out of web/.env.local afterwards.
 *
 * Registering is not strictly required (api/references.ts works anonymously)
 * but Openverse throttles anonymous callers hard, which is exactly what bites
 * when several people search at once during a demo.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REGISTER_URL = 'https://api.openverse.org/v1/auth_tokens/register/'
const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', '.env.local')

function mask(value) {
  if (typeof value !== 'string' || value.length < 8) return '(hidden)'
  return `${value.slice(0, 4)}${'.'.repeat(12)}${value.slice(-2)}`
}

/**
 * Replaces `KEY=` (or an existing value) in place, so the file keeps its
 * comments and ordering. Appends only if the key is genuinely absent.
 */
function upsert(contents, key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  return pattern.test(contents)
    ? contents.replace(pattern, line)
    : `${contents.trimEnd()}\n${line}\n`
}

const email = process.argv[2]
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/register-openverse.mjs you@example.com')
  process.exit(1)
}

const res = await fetch(REGISTER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: `Sinopia (${Date.now()})`, // Openverse rejects a name already taken
    description: 'Reference image search for Sinopia, a GIBC V2 hackathon project',
    email,
  }),
})

if (!res.ok) {
  console.error(`Registration failed: ${res.status} ${res.statusText}`)
  console.error(await res.text())
  process.exit(1)
}

const data = await res.json()
if (!data.client_id || !data.client_secret) {
  console.error('Unexpected response shape; no credentials returned.')
  process.exit(1)
}

let env = ''
try {
  env = await readFile(ENV_PATH, 'utf8')
} catch {
  env = '# Created by scripts/register-openverse.mjs\n'
}

env = upsert(env, 'OPENVERSE_CLIENT_ID', data.client_id)
env = upsert(env, 'OPENVERSE_CLIENT_SECRET', data.client_secret)
await writeFile(ENV_PATH, env)

console.log('\nRegistered. Written to web/.env.local (gitignored):')
console.log(`  OPENVERSE_CLIENT_ID     ${mask(data.client_id)}`)
console.log(`  OPENVERSE_CLIENT_SECRET ${mask(data.client_secret)}`)
console.log(`\nCheck ${email} and click the verification link --`)
console.log('until you do, the client stays throttled at the anonymous rate.')
console.log('\nThen open web/.env.local and copy both values into Vercel.')
