/** Reference query sanitization (ARCHITECTURE.md §5: length + control-char stripping). */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler, { sanitizeQuery } from './references'

describe('sanitizeQuery', () => {
  it('trims whitespace', () => {
    expect(sanitizeQuery('  fire hydrant  ')).toBe('fire hydrant')
  })

  it('strips control characters', () => {
    expect(sanitizeQuery('fire\x00 hydrant\x1f')).toBe('fire hydrant')
  })

  it('caps length at 60 characters', () => {
    const long = 'a'.repeat(100)
    expect(sanitizeQuery(long)).toHaveLength(60)
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizeQuery(undefined)).toBe('')
    expect(sanitizeQuery(42)).toBe('')
  })
})

function mockReq(query: Record<string, string>): VercelRequest {
  return { method: 'GET', query } as unknown as VercelRequest
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value
      return res
    },
  }
  return res as unknown as VercelResponse & typeof res
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('handler', () => {
  it('maps an Openverse 429 to a distinct rate-limited response', async () => {
    vi.stubEnv('OPENVERSE_CLIENT_ID', 'id')
    vi.stubEnv('OPENVERSE_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('auth_tokens')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 't', expires_in: 3600 }),
          })
        }
        return Promise.resolve({ ok: false, status: 429 })
      }),
    )

    const res = mockRes()
    await handler(mockReq({ q: 'fire hydrant' }), res)

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'Too many searches right now' })
  })

  it('rejects a missing query with 400', async () => {
    const res = mockRes()
    await handler(mockReq({}), res)
    expect(res.statusCode).toBe(400)
  })

  it('rejects non-GET methods with 405', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {} } as unknown as VercelRequest, res)
    expect(res.statusCode).toBe(405)
  })
})
