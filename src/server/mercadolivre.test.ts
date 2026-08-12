// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MlSearchError, clampLimit, mlConfigured, normalizeQuery, searchMercadoLivre } from '../../netlify/functions/_shared/mercadolivre'
import { signSession } from '../../netlify/functions/_shared/auth'
import handler from '../../netlify/functions/admin-research-mercadolivre'

const SECRET = 'a-secret-with-at-least-32-characters'
async function authed(path: string): Promise<Request> {
  const token = await signSession('admin@distritogeek.com.br', SECRET)
  return new Request(`https://distritogeek.com.br${path}`, { headers: { cookie: `dg_admin=${token}` } })
}

const AT = '2026-08-12T10:00:00.000Z'
const okResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const mlItem = (over: Record<string, unknown> = {}) => ({
  id: 'MLB1', title: 'Kit Goblin RPG 32mm', permalink: 'https://produto.mercadolivre.com.br/MLB-1',
  price: 79.9, thumbnail: 'https://x.jpg', sold_quantity: 40, seller: { id: 9, nickname: 'Loja' }, category_id: 'MLB1', attributes: [], ...over,
})

const search = (body: unknown, status = 200, extra = {}) =>
  searchMercadoLivre('kit goblin rpg', 24, { token: 'fake', fetchImpl: vi.fn().mockResolvedValue(okResponse(body, status)) as unknown as typeof fetch, capturedAt: AT, ...extra })

describe('helpers puros', () => {
  it('clampLimit respeita 1..50 com default 24', () => {
    expect(clampLimit(undefined)).toBe(24)
    expect(clampLimit(0)).toBe(24)
    expect(clampLimit(10)).toBe(10)
    expect(clampLimit(999)).toBe(50)
  })
  it('normalizeQuery apara e rejeita curta demais', () => {
    expect(normalizeQuery('  goblin  ')).toBe('goblin')
    expect(() => normalizeQuery('a')).toThrow(MlSearchError)
    expect(() => normalizeQuery('')).toThrow(MlSearchError)
  })
})

describe('searchMercadoLivre — mapeamento e erros', () => {
  it('mapeia resultados e metadata', async () => {
    const result = await search({ results: [mlItem(), mlItem({ id: 'MLB2' })] })
    expect(result.results).toHaveLength(2)
    expect(result.results[0].draft.price).toBe(79.9)
    expect(result.metadata).toMatchObject({ provider: 'mercado-livre', query: 'kit goblin rpg', returned: 2, limit: 24, capturedAt: AT })
  })
  it('sold ausente vira unknown (regressão)', async () => {
    const result = await search({ results: [mlItem({ sold_quantity: undefined })] })
    expect(result.results[0].draft.sold).toBe('unknown')
  })
  it('401 → auth', async () => { await expect(search({}, 401)).rejects.toMatchObject({ code: 'auth', httpStatus: 401 }) })
  it('403 → auth', async () => { await expect(search({}, 403)).rejects.toMatchObject({ code: 'auth' }) })
  it('429 → rate', async () => { await expect(search({}, 429)).rejects.toMatchObject({ code: 'rate', httpStatus: 429 }) })
  it('500 → upstream', async () => { await expect(search({}, 500)).rejects.toMatchObject({ code: 'upstream' }) })
  it('payload inválido → invalid', async () => { await expect(search({ nope: true })).rejects.toMatchObject({ code: 'invalid' }) })
  it('timeout (AbortError) → timeout', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(searchMercadoLivre('kit goblin', 24, { token: 'fake', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({ code: 'timeout', httpStatus: 504 })
  })
  it('erro de rede → upstream', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(searchMercadoLivre('kit goblin', 24, { token: 'fake', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({ code: 'upstream' })
  })
  it('nunca envia o token na URL, só no header Authorization', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ results: [] }))
    await searchMercadoLivre('goblin', 24, { token: 'secret-token', fetchImpl: fetchImpl as unknown as typeof fetch })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).not.toContain('secret-token')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret-token' })
  })
})

describe('endpoint admin-research-mercadolivre', () => {
  beforeEach(() => { process.env.SESSION_SECRET = SECRET })
  afterEach(() => { delete process.env.SESSION_SECRET; delete process.env.ML_ACCESS_TOKEN; vi.restoreAllMocks() })

  it('rejeita sem sessão admin (401, no-store)', async () => {
    const response = await handler(new Request('https://distritogeek.com.br/api/admin-research-mercadolivre?q=goblin'))
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('feature flag: sem credenciais responde configured:false (Radar segue manual)', async () => {
    const response = await handler(await authed('/api/admin-research-mercadolivre?q=goblin'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ configured: false })
  })

  it('query vazia com credenciais → 400 sem tocar a rede', async () => {
    process.env.ML_ACCESS_TOKEN = 'static-token'
    const response = await handler(await authed('/api/admin-research-mercadolivre?q='))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'query' })
  })
})
