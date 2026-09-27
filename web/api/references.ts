/**
 * Openverse reference proxy (ARCHITECTURE.md §2, §5). FR-005, NFR-004.
 * GET /api/references?q=&page= only. Keeps the Openverse client secret
 * server-side and caches results for a day.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const TOKEN_URL = 'https://api.openverse.org/v1/auth_tokens/token/'
const SEARCH_URL = 'https://api.openverse.org/v1/images/'
const MAX_QUERY_LENGTH = 60

interface OpenverseResult {
  id: string
  thumbnail: string
  url: string
  title: string
  creator: string | null
  license: string | null
  license_version: string | null
  license_url: string | null
  foreign_landing_url: string | null
  provider: string
  mature: boolean
}

let cachedToken: { token: string; expiresAt: number } | undefined

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const clientId = process.env.OPENVERSE_CLIENT_ID
  const clientSecret = process.env.OPENVERSE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('OPENVERSE_CLIENT_ID / OPENVERSE_CLIENT_SECRET are not set (see docs/SETUP.md)')
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`Openverse token request failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return cachedToken.token
}

export function sanitizeQuery(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : ''
  return s
    .replace(/[\x00-\x1f\x7f]/g, '') // eslint-disable-line no-control-regex -- deliberately stripping control characters
    .slice(0, MAX_QUERY_LENGTH)
    .trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Only GET is supported' })
    return
  }

  const q = sanitizeQuery(req.query.q)
  if (!q) {
    res.status(400).json({ error: 'q is required' })
    return
  }
  const pageNum = Number.parseInt(typeof req.query.page === 'string' ? req.query.page : '1', 10)
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1

  try {
    const token = await getAccessToken()
    const params = new URLSearchParams({
      q,
      page: String(page),
      page_size: '20',
      license_type: 'commercial,modification',
      mature: 'false',
      category: 'photograph',
    })

    const openverseRes = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!openverseRes.ok) {
      res.status(502).json({ error: 'Openverse request failed' })
      return
    }

    const data = (await openverseRes.json()) as { results: OpenverseResult[] }
    // NFR-004: never show a result missing license, creator or source URL.
    const results = data.results
      .filter((r) => r.license && r.creator && r.foreign_landing_url && !r.mature)
      .map((r) => ({
        id: r.id,
        thumbnail: r.thumbnail,
        url: r.url,
        title: r.title,
        creator: r.creator,
        license: r.license,
        license_version: r.license_version,
        license_url: r.license_url,
        foreign_landing_url: r.foreign_landing_url,
        provider: r.provider,
      }))

    res.setHeader('Cache-Control', 'public, s-maxage=86400')
    res.status(200).json({ results })
  } catch {
    res.status(500).json({ error: 'References are unavailable right now' })
  }
}
