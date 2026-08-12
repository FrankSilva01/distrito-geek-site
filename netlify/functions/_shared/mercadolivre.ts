import { getStore } from '@netlify/blobs'
import { mlItemsToResults, type MlResult, type MlSearchItem } from '../../../src/research/mercadolivre-mapping'

/**
 * Provider Mercado Livre — SERVER-ONLY. As credenciais e o token vivem só aqui; nada de token
 * no navegador. Usa `fetch` nativo (sem SDK). Search público autenticado do ML.
 * Ver docs/provider-mercado-livre.md.
 */
const ML_SEARCH_URL = 'https://api.mercadolibre.com/sites/MLB/search'
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
const STORE_NAME = 'distrito-geek-catalog'
const ML_OAUTH_KEY = 'ml-oauth'

export const DEFAULT_LIMIT = 24
export const MAX_LIMIT = 50
export const MIN_QUERY = 2
export const MAX_QUERY = 120
const TIMEOUT_MS = 8000

export type MlErrorCode = 'not-configured' | 'query' | 'auth' | 'rate' | 'timeout' | 'upstream' | 'invalid'
export class MlSearchError extends Error {
  constructor(public code: MlErrorCode, message: string, public httpStatus = 502) {
    super(message)
    this.name = 'MlSearchError'
  }
}

export type MlSearchResult = {
  results: MlResult[]
  metadata: { provider: 'mercado-livre'; query: string; capturedAt: string; returned: number; limit: number }
}

/** Configurado se há token estático OU credenciais de refresh — para o feature-flag da UI. */
export function mlConfigured(): boolean {
  return Boolean(process.env.ML_ACCESS_TOKEN || (process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET && process.env.ML_REFRESH_TOKEN))
}

/** Puro/testável: limita o tamanho da busca (V1: 1..50, default 24). */
export function clampLimit(value: unknown): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(Math.max(n, 1), MAX_LIMIT)
}

/** Puro/testável: valida e normaliza a query. Lança MlSearchError('query') se inválida. */
export function normalizeQuery(raw: unknown): string {
  const query = String(raw ?? '').trim()
  if (query.length < MIN_QUERY) throw new MlSearchError('query', `Informe um termo de busca (mínimo ${MIN_QUERY} caracteres).`, 400)
  return query.slice(0, MAX_QUERY)
}

type StoredToken = { accessToken?: string; refreshToken?: string; expiresAt?: number }
let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function readStoredToken(): Promise<StoredToken> {
  const value = await getStore(STORE_NAME).get(ML_OAUTH_KEY, { type: 'json' }).catch(() => null)
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as StoredToken) : {}
}

async function refreshAccessToken(fetchImpl: typeof fetch, refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ML_CLIENT_ID || '',
    client_secret: process.env.ML_CLIENT_SECRET || '',
    refresh_token: refreshToken,
  })
  const response = await fetchImpl(ML_TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body })
  if (!response.ok) throw new MlSearchError('auth', 'Não foi possível renovar o token do Mercado Livre. Reautorize o aplicativo.', 401)
  const data = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!data.access_token) throw new MlSearchError('auth', 'Resposta de token do Mercado Livre inválida.', 401)
  return { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken, expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 6 * 60 * 60 * 1000) }
}

/** Resolve o access token server-side: cache → Blobs → refresh (rotaciona e persiste) → token estático. */
async function resolveAccessToken(fetchImpl: typeof fetch): Promise<string> {
  const fresh = (expiresAt?: number) => typeof expiresAt === 'number' && expiresAt > Date.now() + 60_000
  if (cachedToken && fresh(cachedToken.expiresAt)) return cachedToken.accessToken
  const stored = await readStoredToken()
  if (stored.accessToken && fresh(stored.expiresAt)) {
    cachedToken = { accessToken: stored.accessToken, expiresAt: stored.expiresAt! }
    return stored.accessToken
  }
  const refreshToken = stored.refreshToken || process.env.ML_REFRESH_TOKEN
  if (process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET && refreshToken) {
    const next = await refreshAccessToken(fetchImpl, refreshToken)
    cachedToken = { accessToken: next.accessToken, expiresAt: next.expiresAt }
    await getStore(STORE_NAME).setJSON(ML_OAUTH_KEY, next).catch(() => {})
    return next.accessToken
  }
  if (process.env.ML_ACCESS_TOKEN) return process.env.ML_ACCESS_TOKEN
  throw new MlSearchError('not-configured', 'Mercado Livre não configurado.', 503)
}

export type SearchDeps = { fetchImpl?: typeof fetch; token?: string; timeoutMs?: number; capturedAt?: string }

/**
 * Consulta o /sites/MLB/search e devolve resultados já normalizados (EvidenceDraft) para revisão.
 * Não persiste nada. Nunca retorna nem loga o token. `deps.token`/`deps.fetchImpl` servem aos testes.
 */
export async function searchMercadoLivre(rawQuery: string, rawLimit: unknown, deps: SearchDeps = {}): Promise<MlSearchResult> {
  const fetchImpl = deps.fetchImpl || fetch
  const query = normalizeQuery(rawQuery)
  const limit = clampLimit(rawLimit)
  const capturedAt = deps.capturedAt || new Date().toISOString()
  const token = deps.token || (await resolveAccessToken(fetchImpl))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? TIMEOUT_MS)
  let response: Response
  try {
    const url = `${ML_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${limit}`
    response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new MlSearchError('timeout', 'O Mercado Livre demorou para responder. Tente novamente.', 504)
    throw new MlSearchError('upstream', 'Não foi possível consultar o Mercado Livre.', 502)
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401 || response.status === 403) { cachedToken = null; throw new MlSearchError('auth', 'Autorização do Mercado Livre inválida ou expirada.', 401) }
  if (response.status === 429) throw new MlSearchError('rate', 'Muitas consultas ao Mercado Livre em pouco tempo. Aguarde e tente de novo.', 429)
  if (response.status >= 500) throw new MlSearchError('upstream', 'O Mercado Livre está indisponível no momento.', 502)
  if (!response.ok) throw new MlSearchError('upstream', 'Não foi possível consultar o Mercado Livre.', 502)

  const data = await response.json().catch(() => null) as { results?: unknown } | null
  if (!data || !Array.isArray(data.results)) throw new MlSearchError('invalid', 'Resposta inesperada do Mercado Livre.', 502)

  const results = mlItemsToResults(data.results as MlSearchItem[], capturedAt)
  return { results, metadata: { provider: 'mercado-livre', query, capturedAt, returned: results.length, limit } }
}
