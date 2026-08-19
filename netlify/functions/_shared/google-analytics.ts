import { createSign } from 'node:crypto'
import { clarityInsights } from './clarity'
import { GUIDE_CLUSTERS, GUIDE_INDEX, type GuideClusterId } from '../../../src/content/guides-index'
import { normalizeCatalogIntent } from '../../../src/domain/catalog-filters'

const base64url = (value: string) => Buffer.from(value).toString('base64url')
const allowedPeriods = new Set([7, 28, 90])
type GoogleRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }
type GoogleReport = { rows?: GoogleRow[]; totals?: GoogleRow[] }
export type RecentEvent = { name: string; count: number; minutesAgo: number; lastSeenAt: string }
export type SearchSignal = { normalizedTerm: string; variants: string[]; searches: number; users: number; sessions: number; lastOccurredAt: string }
type SearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
type SearchReport = { rows?: SearchRow[]; unavailable?: boolean }
type SearchItem = { label: string; clicks: number; impressions: number; ctr: number; position: number }
export type SearchTerm = { query: string; landingPage: string; clicks: number; impressions: number; ctr: number; position: number }
export type GuidePerformance = { page: string; clicks: number; impressions: number; ctr: number; position: number }
export type SeoBand = { id: 'defender' | 'top-3' | 'primeira-pagina' | 'secundaria'; label: string; hint: string; queries: SearchTerm[] }
export type LowCtrItem = SearchTerm & { suggestion: string }
/**
 * `ok` = respondeu com linhas. `empty` = respondeu 200 sem linhas, que é o normal para
 * site novo ou período ainda não consolidado. `error` = falha real de API, permissão ou
 * autenticação. Nunca colapsar `error` em zero: o painel precisa mostrar coisas diferentes.
 */
export type IntegrationStatus = 'ok' | 'empty' | 'error'
type SearchConsoleResult = { available: boolean; status: IntegrationStatus; totals: { clicks: number; impressions: number; ctr: number; position: number }; previousTotals: { clicks: number; impressions: number }; rows: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>; topQueries: SearchItem[]; topPages: SearchItem[]; opportunities: Array<SearchItem & { kind: string; previousClicks?: number }>; guidePerformance: GuidePerformance[]; searchTerms: SearchTerm[]; seoBands: SeoBand[]; lowCtr: LowCtrItem[]; contentGaps: ContentGap[]; message?: string }

/** Extrai só o caminho (sem query nem hash) de uma URL ou path do GA/Search Console. */
export function pagePath(page: string): string {
  if (!page) return ''
  try { return new URL(page).pathname } catch { const path = page.split(/[?#]/)[0]; return path.startsWith('/') ? path : `/${path}` }
}
type SearchDataRow = SearchConsoleResult['rows'][number]

/** Desempenho de /guias/* agregado por página. Uma consulta só; a filtragem é local. */
export function guidePerformanceFrom(rows: SearchDataRow[]): GuidePerformance[] {
  const grouped = new Map<string, { clicks: number; impressions: number; weighted: number }>()
  rows.forEach((row) => {
    const path = pagePath(row.page)
    if (!path.startsWith('/guias/')) return
    const value = grouped.get(path) || { clicks: 0, impressions: 0, weighted: 0 }
    value.clicks += row.clicks; value.impressions += row.impressions; value.weighted += row.position * row.impressions
    grouped.set(path, value)
  })
  return [...grouped].map(([page, value]) => ({ page, clicks: value.clicks, impressions: value.impressions, ctr: value.impressions ? value.clicks / value.impressions : 0, position: value.impressions ? value.weighted / value.impressions : 0 })).sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
}

/** Termos de pesquisa agregados por query, com a landing de mais impressões da query. */
export function searchTermsFrom(rows: SearchDataRow[]): SearchTerm[] {
  const grouped = new Map<string, { clicks: number; impressions: number; weighted: number; pages: Map<string, number> }>()
  rows.forEach((row) => {
    const query = row.query || '(não informado)'
    const value = grouped.get(query) || { clicks: 0, impressions: 0, weighted: 0, pages: new Map<string, number>() }
    value.clicks += row.clicks; value.impressions += row.impressions; value.weighted += row.position * row.impressions
    const path = pagePath(row.page); if (path) value.pages.set(path, (value.pages.get(path) || 0) + row.impressions)
    grouped.set(query, value)
  })
  return [...grouped].map(([query, value]) => {
    const landingPage = [...value.pages].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    return { query, landingPage, clicks: value.clicks, impressions: value.impressions, ctr: value.impressions ? value.clicks / value.impressions : 0, position: value.impressions ? value.weighted / value.impressions : 0 }
  }).sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
}

// Faixas por posição média. Prioridade dentro da faixa é sempre por impressões: onde há
// mais gente vendo, o ganho é maior. Sem score inventado — só posição e impressões reais.
const SEO_BAND_DEFS: Array<{ id: SeoBand['id']; label: string; hint: string; min: number; max: number }> = [
  { id: 'defender', label: 'Posição 1–3 · defender', hint: 'Já no topo. Monitore para não perder posição.', min: 1, max: 3 },
  { id: 'top-3', label: 'Posição 4–10 · oportunidade Top 3', hint: 'Primeira página; dá para subir ao Top 3 com título e conteúdo mais fortes.', min: 4, max: 10 },
  { id: 'primeira-pagina', label: 'Posição 11–20 · oportunidade primeira página', hint: 'Perto da primeira página. Reforce a intenção e os links internos.', min: 11, max: 20 },
  { id: 'secundaria', label: 'Posição 21–40 · oportunidade secundária', hint: 'Há demanda, mas a página ainda ranqueia longe. Avalie conteúdo dedicado.', min: 21, max: 40 },
]
export function seoBandsFrom(searchTerms: SearchTerm[]): SeoBand[] {
  return SEO_BAND_DEFS.map((band) => ({ id: band.id, label: band.label, hint: band.hint, queries: searchTerms.filter((term) => term.impressions > 0 && term.position >= band.min && term.position <= band.max).sort((a, b) => b.impressions - a.impressions).slice(0, 20) }))
}

export type ContentGap = { query: string; landingPage: string; impressions: number; clicks: number; position: number; note: string }
// Query com impressões reais caindo na home ou sem landing definida: sinal de que falta
// uma página específica para aquela intenção. Só sinaliza — nunca cria conteúdo sozinho.
export function contentGapsFrom(searchTerms: SearchTerm[], minImpressions = 15): ContentGap[] {
  const isHome = (path: string) => path === '' || path === '/'
  return searchTerms.filter((term) => term.impressions >= minImpressions && isHome(term.landingPage))
    .map((term) => ({ query: term.query, landingPage: term.landingPage || '/', impressions: term.impressions, clicks: term.clicks, position: term.position, note: 'Possível oportunidade de conteúdo/produto: há busca com impressões, mas a entrada cai na home, sem página dedicada.' }))
    .sort((a, b) => b.impressions - a.impressions).slice(0, 20)
}

// CTR baixo com boa posição e volume real: sinal de título/description/intenção a revisar.
// Nunca altera metadata — só aponta.
export function lowCtrFrom(searchTerms: SearchTerm[]): LowCtrItem[] {
  return searchTerms.filter((term) => term.position >= 1 && term.position <= 15 && term.impressions >= 20 && term.ctr < 0.03)
    .map((term) => ({ ...term, suggestion: 'Boa posição e volume, mas CTR baixo. Revise title, meta description e se a página atende a intenção da busca.' }))
    .sort((a, b) => b.impressions - a.impressions).slice(0, 20)
}

// ————————————————————————————————————————————————————————————————
// Dashboard Etapa C: funil editorial, visão por cluster, tendências, landings.
// Funções puras, testáveis sem tocar a API. O funil e a visão por cluster ficam
// vazios até as custom dimensions do GA4 existirem — o backend degrada para vazio,
// não quebra. Zero é tratado explicitamente; nunca aparece infinito.
// ————————————————————————————————————————————————————————————————

export type LandingKind = 'guide' | 'product' | 'category' | 'other' | 'unknown'

/**
 * O GA4 devolve `(not set)` quando não consegue atribuir a landing da sessão. Isso não é uma
 * rota do site: `pagePath` cairia no catch e prefixaria uma barra, inventando `/(not set)`.
 * As métricas continuam válidas, então a linha é preservada e marcada como `unknown`.
 */
export const GA_UNATTRIBUTED_LANDING = '(not set)'
export const isUnattributedLanding = (value: string) => value.trim().toLowerCase() === GA_UNATTRIBUTED_LANDING
export type GuideFunnelRow = { slug: string; title: string; cluster: GuideClusterId; views: number; productClicks: number; categoryClicks: number; relatedClicks: number; productCtr: number }
export type ClusterView = { cluster: GuideClusterId; label: string; guideViews: number; organicEntrances: number; impressions: number; clicks: number; productClicks: number }
export type OrganicLanding = { path: string; kind: LandingKind; users: number; sessions: number; clicks: number; impressions: number; ctr: number; position: number }
export type TrendMetric = { current: number; previous: number; delta: number; changeRatio: number | null }

const slugToCluster = new Map(GUIDE_INDEX.map((guide) => [guide.slug, guide.cluster]))
const slugToTitle = new Map(GUIDE_INDEX.map((guide) => [guide.slug, guide.title]))

/** Classifica uma landing pelo caminho, para o relatório de páginas de entrada orgânica. */
export function classifyLanding(path: string): LandingKind {
  if (isUnattributedLanding(path)) return 'unknown'
  if (path.startsWith('/guias/')) return 'guide'
  if (path.startsWith('/produto/')) return 'product'
  if (path.startsWith('/categoria/') || path.startsWith('/miniaturas') || path.startsWith('/action-figures') || path.startsWith('/kits-')) return 'category'
  return 'other'
}

/** Slug do guia a partir do caminho `/guias/<slug>`. */
export const guideSlugFromPath = (path: string) => path.match(/^\/guias\/([^/?#]+)/)?.[1] || ''

/**
 * Funil editorial por guia, a partir de linhas GA [eventName, guide_slug].
 * `productCtr` é a razão product_click/view; view=0 vira 0, nunca divisão inválida.
 */
export function guideFunnelFrom(rows: Array<{ event: string; slug: string; count: number }>): GuideFunnelRow[] {
  const byGuide = new Map<string, { views: number; productClicks: number; categoryClicks: number; relatedClicks: number }>()
  rows.forEach((row) => {
    if (!row.slug) return
    const value = byGuide.get(row.slug) || { views: 0, productClicks: 0, categoryClicks: 0, relatedClicks: 0 }
    if (row.event === 'guide_view') value.views += row.count
    else if (row.event === 'guide_product_click') value.productClicks += row.count
    else if (row.event === 'guide_category_click') value.categoryClicks += row.count
    else if (row.event === 'guide_related_click') value.relatedClicks += row.count
    byGuide.set(row.slug, value)
  })
  return [...byGuide].map(([slug, value]) => ({ slug, title: slugToTitle.get(slug) || slug, cluster: (slugToCluster.get(slug) || 'miniaturas') as GuideClusterId, ...value, productCtr: value.views ? value.productClicks / value.views : 0 })).sort((a, b) => b.views - a.views || b.productClicks - a.productClicks)
}

/** Rollup por cluster, cruzando funil (views/product clicks), Search Console e entradas orgânicas. */
export function clusterViewFrom(funnel: GuideFunnelRow[], guidePerformance: GuidePerformance[], organicLandings: OrganicLanding[]): ClusterView[] {
  return GUIDE_CLUSTERS.map((cluster) => {
    const guides = funnel.filter((row) => row.cluster === cluster.id)
    const pages = guidePerformance.filter((row) => slugToCluster.get(guideSlugFromPath(row.page)) === cluster.id)
    const entrances = organicLandings.filter((row) => row.kind === 'guide' && slugToCluster.get(guideSlugFromPath(row.path)) === cluster.id)
    return {
      cluster: cluster.id, label: cluster.label,
      guideViews: guides.reduce((sum, row) => sum + row.views, 0),
      organicEntrances: entrances.reduce((sum, row) => sum + row.sessions, 0),
      impressions: pages.reduce((sum, row) => sum + row.impressions, 0),
      clicks: pages.reduce((sum, row) => sum + row.clicks, 0),
      productClicks: guides.reduce((sum, row) => sum + row.productClicks, 0),
    }
  })
}

/** Variação entre dois períodos. `previous=0` não vira infinito: changeRatio fica null. */
export function trend(current: number, previous: number): TrendMetric {
  return { current, previous, delta: current - previous, changeRatio: previous > 0 ? (current - previous) / previous : null }
}

/**
 * Soma uma métrica de um relatório GA com dois dateRanges. Quando há mais de um período,
 * o GA acrescenta a dimensão `dateRange` (`date_range_0` = atual, `date_range_1` = anterior)
 * como a última dimensão da linha. Devolve os totais somados de cada período.
 */
export function sumDualRange(report: GoogleReport, metricIndex = 0): { current: number; previous: number } {
  let current = 0, previous = 0
  for (const row of report.rows || []) {
    const rangeTag = (row.dimensionValues || []).map((value) => value.value).find((value) => value === 'date_range_0' || value === 'date_range_1')
    const value = num(row, metricIndex)
    if (rangeTag === 'date_range_1') previous += value; else current += value
  }
  return { current, previous }
}

/** Soma a contagem de um evento específico num relatório dual-range com dimensão eventName primeiro. */
export function sumDualRangeEvent(report: GoogleReport, eventName: string): { current: number; previous: number } {
  let current = 0, previous = 0
  for (const row of report.rows || []) {
    if (row.dimensionValues?.[0]?.value !== eventName) continue
    const rangeTag = row.dimensionValues?.find((value) => value.value === 'date_range_0' || value.value === 'date_range_1')?.value
    const value = num(row, 0)
    if (rangeTag === 'date_range_1') previous += value; else current += value
  }
  return { current, previous }
}

export function isCommercialReportPath(value: string): boolean {
  const normalized = value.toLowerCase()
  const path = pagePath(value).toLowerCase()
  return path !== '/admin' && !path.startsWith('/admin/') && !/[?&](gtm_debug|gtm_preview|gtm_auth)=/.test(normalized) && !normalized.includes('tagassistant.google.com')
}

export function productPageViewsFrom(rows: GoogleRow[]): number {
  return rows.reduce((sum, row) => sum + num(row, 0), 0)
}

export function productAnalyticsTitle(path: string, pageTitle: string): string {
  if (pageTitle && !/^Distrito Geek\s*\|/i.test(pageTitle)) return pageTitle
  const slug = pagePath(path).replace(/^\/produto\//, '').replace(/-mlb\d+$/i, '')
  const title = slug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  return title ? title.charAt(0).toLocaleUpperCase('pt-BR') + title.slice(1) : 'Produto'
}

const COMMERCIAL_CLICK_EVENTS = ['click_mercado_livre', 'click_shopee', 'click_tiktok_shop', 'click_whatsapp_product'] as const

export function commercialProductRowsFrom(productReport: GoogleReport, clickReport: GoogleReport) {
  const clicksByPath = new Map<string, { ml: number; shopee: number; tiktok: number; whatsapp: number }>()
  for (const row of clickReport.rows || []) {
    const event = row.dimensionValues?.[0]?.value || ''
    const path = row.dimensionValues?.[1]?.value || ''
    if (!path || !COMMERCIAL_CLICK_EVENTS.includes(event as typeof COMMERCIAL_CLICK_EVENTS[number])) continue
    const clicks = clicksByPath.get(path) || { ml: 0, shopee: 0, tiktok: 0, whatsapp: 0 }
    if (event === 'click_mercado_livre') clicks.ml += num(row, 0)
    else if (event === 'click_shopee') clicks.shopee += num(row, 0)
    else if (event === 'click_tiktok_shop') clicks.tiktok += num(row, 0)
    else clicks.whatsapp += num(row, 0)
    clicksByPath.set(path, clicks)
  }
  return (productReport.rows || []).map((row) => {
    const path = row.dimensionValues?.[0]?.value || ''
    const clicks = clicksByPath.get(path) || { ml: 0, shopee: 0, tiktok: 0, whatsapp: 0 }
    const views = num(row, 0)
    const totalCommercialClicks = clicks.ml + clicks.shopee + clicks.tiktok + clicks.whatsapp
    return {
      path, title: productAnalyticsTitle(path, row.dimensionValues?.[1]?.value || ''), views, users: num(row, 1),
      mercadoLivreClicks: clicks.ml, shopeeClicks: clicks.shopee, tiktokClicks: clicks.tiktok, whatsappClicks: clicks.whatsapp,
      totalCommercialClicks, commercialCtr: views ? totalCommercialClicks / views : 0,
    }
  })
}

/** Agrega landings orgânicas do GA e cruza com clicks/impressões/posição do Search Console. */
export function organicLandingsFrom(rows: GoogleRow[], guidePerformance: GuidePerformance[], searchByPath: Map<string, { clicks: number; impressions: number; ctr: number; position: number }>): OrganicLanding[] {
  const scByPath = new Map(searchByPath)
  guidePerformance.forEach((row) => { if (!scByPath.has(row.page)) scByPath.set(row.page, { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position }) })
  const grouped = new Map<string, { users: number; sessions: number }>()
  rows.forEach((row) => {
    const rawPath = row.dimensionValues?.[0]?.value || ''
    if (!isCommercialReportPath(rawPath)) return
    // Preserva o valor cru do GA4 em vez de deixar `pagePath` transformá-lo numa rota falsa.
    const path = isUnattributedLanding(rawPath) ? GA_UNATTRIBUTED_LANDING : pagePath(rawPath)
    if (!path) return
    const value = grouped.get(path) || { users: 0, sessions: 0 }
    value.users += num(row, 0); value.sessions += num(row, 1)
    grouped.set(path, value)
  })
  return [...grouped].map(([path, value]) => { const sc = scByPath.get(path) || { clicks: 0, impressions: 0, ctr: 0, position: 0 }; return { path, kind: classifyLanding(path), users: value.users, sessions: value.sessions, ...sc } }).sort((a, b) => b.sessions - a.sessions || b.impressions - a.impressions).slice(0, 40)
}

function credentials() {
  const clientEmail = process.env.GA4_CLIENT_EMAIL, encodedKey = process.env.GA4_PRIVATE_KEY_B64, legacyKey = process.env.GA4_PRIVATE_KEY
  return { clientEmail, privateKey: encodedKey ? Buffer.from(encodedKey, 'base64').toString('utf8') : legacyKey }
}
async function accessToken() {
  const { clientEmail, privateKey } = credentials()
  if (!clientEmail || !privateKey) throw new Error('Credenciais Google não configuradas.')
  const now = Math.floor(Date.now() / 1000), payload = { iss: clientEmail, scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey.replace(/\\n/g, '\n'), 'base64url')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }) })
  if (!response.ok) throw new Error('Não foi possível autenticar os relatórios do Google.')
  return (await response.json() as { access_token: string }).access_token
}
async function gaReport(token: string, property: string, body: Record<string, unknown>): Promise<GoogleReport> {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error('O Google Analytics não liberou o relatório solicitado.')
  return response.json() as Promise<GoogleReport>
}
type DimensionFilter = Record<string, unknown>
export function commercialDimensionFilter(additional?: DimensionFilter, pathField = 'pagePath'): DimensionFilter {
  const expressions: DimensionFilter[] = [
    { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 'distritogeek.com.br', caseSensitive: false } } },
    { notExpression: { filter: { fieldName: pathField, stringFilter: { matchType: 'BEGINS_WITH', value: '/admin', caseSensitive: false } } } },
    { notExpression: { filter: { fieldName: pathField, stringFilter: { matchType: 'CONTAINS', value: 'gtm_debug', caseSensitive: false } } } },
    { notExpression: { filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'CONTAINS', value: 'tagassistant.google.com', caseSensitive: false } } } },
  ]
  if (additional) expressions.push(additional)
  return { andGroup: { expressions } }
}
async function realtimeReport(token: string, property: string): Promise<GoogleReport> {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runRealtimeReport`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ dimensions: [{ name: 'eventName' }, { name: 'minutesAgo' }], metrics: [{ name: 'eventCount' }], limit: 100 }) })
  if (!response.ok) throw new Error(`GA4 Realtime HTTP ${response.status}`)
  return response.json() as Promise<GoogleReport>
}
const num = (row: GoogleRow | undefined, index: number) => Number(row?.metricValues?.[index]?.value || 0)
const isSearchNoise = (value: string) => { const normalized = value.trim().toLowerCase(); return normalized.length < 2 || normalized === '(not set)' || normalized.startsWith('/admin') || /https?:\/\/|www\.|tagassistant|gtm[_ -]|debug/.test(normalized) }
const gaMinuteToIso = (value: string) => /^\d{12}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:00` : ''
/** Une métricas agregadas por termo a ocorrências reais, sem somar usuários/sessões por minuto. */
export function searchSignalsFrom(summary: GoogleReport, occurrences: GoogleReport): SearchSignal[] {
  const grouped = new Map<string, SearchSignal>()
  for (const row of summary.rows || []) { const raw = row.dimensionValues?.[0]?.value?.trim() || ''; if (isSearchNoise(raw)) continue; const normalizedTerm = normalizeCatalogIntent(raw); if (!normalizedTerm) continue; const item = grouped.get(normalizedTerm) || { normalizedTerm, variants: [], searches: 0, users: 0, sessions: 0, lastOccurredAt: '' }; if (!item.variants.includes(raw)) item.variants.push(raw); item.searches += num(row, 0); item.users += num(row, 1); item.sessions += num(row, 2); grouped.set(normalizedTerm, item) }
  for (const row of occurrences.rows || []) { const item = grouped.get(normalizeCatalogIntent(row.dimensionValues?.[0]?.value || '')); if (!item) continue; const occurredAt = gaMinuteToIso(row.dimensionValues?.[1]?.value || ''); if (occurredAt && occurredAt > item.lastOccurredAt) item.lastOccurredAt = occurredAt }
  return [...grouped.values()].sort((a, b) => b.searches - a.searches || b.lastOccurredAt.localeCompare(a.lastOccurredAt))
}
export function normalizeRealtimeEvents(report: GoogleReport, now = new Date()): RecentEvent[] {
  return (report.rows || []).map((row) => { const minutesAgo = Number(row.dimensionValues?.[1]?.value || 0); return { name: row.dimensionValues?.[0]?.value || 'evento', count: num(row, 0), minutesAgo, lastSeenAt: new Date(now.getTime() - minutesAgo * 60000).toISOString() } }).sort((a, b) => a.minutesAgo - b.minutesAgo || b.count - a.count).slice(0, 30)
}
async function settleRealtime(request: Promise<GoogleReport>) { try { return { available: true, events: normalizeRealtimeEvents(await request) } } catch { return { available: false, events: [] as RecentEvent[] } } }
const aggregateSearch = (rows: SearchConsoleResult['rows'], key: 'query' | 'page'): SearchItem[] => {
  const grouped = new Map<string, { clicks: number; impressions: number; weighted: number }>()
  rows.forEach((row) => { const label = row[key] || '(não informado)', value = grouped.get(label) || { clicks: 0, impressions: 0, weighted: 0 }; value.clicks += row.clicks; value.impressions += row.impressions; value.weighted += row.position * row.impressions; grouped.set(label, value) })
  return [...grouped].map(([label, value]) => ({ label, clicks: value.clicks, impressions: value.impressions, ctr: value.impressions ? value.clicks / value.impressions : 0, position: value.impressions ? value.weighted / value.impressions : 0 })).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
}
export async function settleSearchConsole(request: Promise<SearchReport>, previousRequest?: Promise<SearchReport>): Promise<SearchConsoleResult> {
  try {
    const data = await request
    if (data.unavailable) throw new Error('Search Console unavailable')
    const rows = (data.rows || []).map((row) => ({ query: row.keys?.[0] || '', page: row.keys?.[1] || '', clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 }))
    const totals = rows.reduce((acc, row) => ({ clicks: acc.clicks + row.clicks, impressions: acc.impressions + row.impressions, weighted: acc.weighted + row.position * row.impressions }), { clicks: 0, impressions: 0, weighted: 0 })
    const topQueries = aggregateSearch(rows, 'query'), topPages = aggregateSearch(rows, 'page')
    const previousData = previousRequest ? await previousRequest.catch(() => ({ rows: [] })) : { rows: [] }, previousRows = (previousData.rows || []).map((row) => ({ query: row.keys?.[0] || '', page: row.keys?.[1] || '', clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 })), previousPages = new Map(aggregateSearch(previousRows, 'page').map((row) => [row.label, row.clicks]))
    const opportunities = [...topQueries.filter((row) => row.impressions >= 10 && row.ctr < .03).map((row) => ({ ...row, kind: 'CTR baixo' })), ...topQueries.filter((row) => row.position >= 4 && row.position <= 10).map((row) => ({ ...row, kind: 'Posição 4–10' })), ...topQueries.filter((row) => row.position > 10 && row.position <= 20).map((row) => ({ ...row, kind: 'Posição 11–20' })), ...topPages.filter((row) => (previousPages.get(row.label) || 0) > row.clicks).map((row) => ({ ...row, kind: 'Queda de cliques', previousClicks: previousPages.get(row.label) }))].slice(0, 30)
    const searchTerms = searchTermsFrom(rows)
    const previousTotals = previousRows.reduce((acc, row) => ({ clicks: acc.clicks + row.clicks, impressions: acc.impressions + row.impressions }), { clicks: 0, impressions: 0 })
    return { available: true, status: rows.length ? 'ok' : 'empty', totals: { clicks: totals.clicks, impressions: totals.impressions, ctr: totals.impressions ? totals.clicks / totals.impressions : 0, position: totals.impressions ? totals.weighted / totals.impressions : 0 }, previousTotals, rows: rows.slice(0, 30), topQueries: topQueries.slice(0, 10), topPages: topPages.slice(0, 10), opportunities, guidePerformance: guidePerformanceFrom(rows), searchTerms: searchTerms.slice(0, 50), seoBands: seoBandsFrom(searchTerms), lowCtr: lowCtrFrom(searchTerms), contentGaps: contentGapsFrom(searchTerms), message: rows.length ? undefined : 'Conectado, sem dados para este período. O Search Console leva alguns dias para consolidar.' }
  } catch { return { available: false, status: 'error', totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, previousTotals: { clicks: 0, impressions: 0 }, rows: [], topQueries: [], topPages: [], opportunities: [], guidePerformance: [], searchTerms: [], seoBands: [], lowCtr: [], contentGaps: [], message: 'Não foi possível consultar o Search Console. Verifique a permissão da conta de serviço na propriedade.' } }
}
export function settleSearchConsoleRequests(current: Promise<SearchReport>, previous: Promise<SearchReport>): [Promise<SearchReport>, Promise<SearchReport>] {
  return [current.catch(() => ({ rows: [], unavailable: true })), previous.catch(() => ({ rows: [] }))]
}
const searchRequest = (token: string, siteUrl: string, startDate: string, endDate: string) => fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ startDate, endDate, dimensions: ['query', 'page'], rowLimit: 250 }) }).then(async (response) => { if (!response.ok) throw new Error(`Search Console HTTP ${response.status}`); return response.json() as Promise<SearchReport> })

/** Histórico real da busca interna. O catálogo atual é cruzado no Admin, nunca inferido do evento histórico. */
export async function internalSearchReport(rawPeriod = 90) {
  const property = process.env.GA4_PROPERTY_ID
  if (!property) return { configured: false as const, missing: ['GA4_PROPERTY_ID'], searchSignals: [] as SearchSignal[] }
  const period = rawPeriod > 0 && rawPeriod <= 365 ? rawPeriod : 90, dateRanges = [{ startDate: `${period}daysAgo`, endDate: 'today' }], token = await accessToken()
  const eventFilter = commercialDimensionFilter({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'search_product' } } })
  const [summary, occurrences] = await Promise.all([
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'searchTerm' }], metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }, { name: 'sessions' }], dimensionFilter: eventFilter, orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 250 }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'searchTerm' }, { name: 'dateHourMinute' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter, orderBys: [{ dimension: { dimensionName: 'dateHourMinute' }, desc: true }], limit: 1000 }),
  ])
  return { configured: true as const, period, generatedAt: new Date().toISOString(), searchSignals: searchSignalsFrom(summary, occurrences) }
}

export async function acquisitionReport(rawPeriod = 28) {
  const property = process.env.GA4_PROPERTY_ID, siteUrl = process.env.SEARCH_CONSOLE_SITE_URL, { clientEmail, privateKey } = credentials()
  if (!property || !siteUrl || !clientEmail || !privateKey) return { configured: false as const, missing: [!property && 'GA4_PROPERTY_ID', !siteUrl && 'SEARCH_CONSOLE_SITE_URL', !clientEmail && 'GA4_CLIENT_EMAIL', !privateKey && 'GA4_PRIVATE_KEY_B64'].filter(Boolean) }
  const period = allowedPeriods.has(rawPeriod) ? rawPeriod : 28, dateRanges = [{ startDate: `${period}daysAgo`, endDate: 'today' }], token = await accessToken(), now = Date.now(), day = 86400000
  const currentStart = new Date(now - period * day).toISOString().slice(0, 10), currentEnd = new Date(now).toISOString().slice(0, 10), previousStart = new Date(now - period * 2 * day).toISOString().slice(0, 10), previousEnd = new Date(now - (period + 1) * day).toISOString().slice(0, 10)
  const [currentSearch, previousSearch] = settleSearchConsoleRequests(searchRequest(token, siteUrl, currentStart, currentEnd), searchRequest(token, siteUrl, previousStart, previousEnd))
  // Dois períodos para as tendências. Filtro de tráfego orgânico reutilizado nas landings.
  const dualRanges = [{ startDate: currentStart, endDate: currentEnd }, { startDate: previousStart, endDate: previousEnd }]
  const organicFilter = commercialDimensionFilter({ filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { value: 'Organic Search' } } })
  const organicLandingFilter = commercialDimensionFilter({ filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { value: 'Organic Search' } } }, 'landingPagePlusQueryString')
  const empty = () => ({ rows: [] as GoogleRow[] })
  const [totalsData, channelData, eventData, productData, productClickData, searchConsole, realtime, clarity, guideFunnelData, organicLandingData, trendUsersData, trendEventsData] = await Promise.all([
    gaReport(token, property, { dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }], dimensionFilter: commercialDimensionFilter() }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'sessionSourceMedium' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], dimensionFilter: commercialDimensionFilter(), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 30 }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: commercialDimensionFilter({ filter: { fieldName: 'eventName', inListFilter: { values: ['view_item', ...COMMERCIAL_CLICK_EVENTS] } } }) }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], dimensionFilter: commercialDimensionFilter({ filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/produto/' } } }), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 250 }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'eventName' }, { name: 'pagePath' }], metrics: [{ name: 'eventCount' }], dimensionFilter: commercialDimensionFilter({ filter: { fieldName: 'eventName', inListFilter: { values: [...COMMERCIAL_CLICK_EVENTS] } } }), limit: 250 }).catch(empty),
    settleSearchConsole(currentSearch, previousSearch), settleRealtime(realtimeReport(token, property)), clarityInsights(period),
    // Funil editorial por guia: depende da custom dimension guide_slug do GA4. Sem ela,
    // o relatório falha e degrada para vazio — o painel mostra o estado vazio, não quebra.
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'eventName' }, { name: 'customEvent:guide_slug' }], metrics: [{ name: 'eventCount' }], dimensionFilter: commercialDimensionFilter({ andGroup: { expressions: [{ filter: { fieldName: 'eventName', inListFilter: { values: ['guide_view', 'guide_product_click', 'guide_category_click', 'guide_related_click'] } } }, { notExpression: { filter: { fieldName: 'customEvent:guide_slug', inListFilter: { values: ['', '(not set)'] } } } }] } }), limit: 250 }).catch(empty),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'landingPagePlusQueryString' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], dimensionFilter: organicLandingFilter, orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 100 }).catch(empty),
    gaReport(token, property, { dateRanges: dualRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], dimensionFilter: organicFilter }).catch(empty),
    gaReport(token, property, { dateRanges: dualRanges, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: commercialDimensionFilter({ filter: { fieldName: 'eventName', inListFilter: { values: ['guide_view', 'guide_product_click'] } } }) }).catch(empty),
  ])
  const totalRow = totalsData.rows?.[0] || totalsData.totals?.[0], eventCounts = Object.fromEntries((eventData.rows || []).map((row) => [row.dimensionValues?.[0]?.value || '', num(row, 0)])), productViews = productPageViewsFrom(productData.rows || []), commercialClicks = COMMERCIAL_CLICK_EVENTS.reduce((sum, event) => sum + (eventCounts[event] || 0), 0), channelSessions = (channelData.rows || []).reduce((sum, row) => sum + num(row, 1), 0)
  const commercialProducts = commercialProductRowsFrom(productData, productClickData)
  // Etapa C: funil editorial, visão por cluster, tendências e landings orgânicas.
  const guideFunnel = guideFunnelFrom((guideFunnelData.rows || []).map((row) => ({ event: row.dimensionValues?.[0]?.value || '', slug: row.dimensionValues?.[1]?.value || '', count: num(row, 0) })))
  const searchByPath = new Map(searchConsole.topPages.map((page) => [pagePath(page.label), { clicks: page.clicks, impressions: page.impressions, ctr: page.ctr, position: page.position }]))
  const organicLandings = organicLandingsFrom(organicLandingData.rows || [], searchConsole.guidePerformance, searchByPath)
  const clusterView = clusterViewFrom(guideFunnel, searchConsole.guidePerformance, organicLandings)
  const usersTrend = sumDualRange(trendUsersData, 0), sessionsTrend = sumDualRange(trendUsersData, 1)
  const guideViewsTrend = sumDualRangeEvent(trendEventsData, 'guide_view'), productClicksTrend = sumDualRangeEvent(trendEventsData, 'guide_product_click')
  const trends = {
    organicClicks: trend(searchConsole.totals.clicks, searchConsole.previousTotals.clicks),
    impressions: trend(searchConsole.totals.impressions, searchConsole.previousTotals.impressions),
    organicUsers: trend(usersTrend.current, usersTrend.previous),
    organicSessions: trend(sessionsTrend.current, sessionsTrend.previous),
    guideViews: trend(guideViewsTrend.current, guideViewsTrend.previous),
    productClicks: trend(productClicksTrend.current, productClicksTrend.previous),
  }
  return { configured: true as const, period, generatedAt: new Date().toISOString(), guideFunnel, clusterView, organicLandings, trends, totals: { users: num(totalRow, 0), sessions: num(totalRow, 1), pageViews: num(totalRow, 2), productViews, mercadoLivreClicks: eventCounts.click_mercado_livre || 0, shopeeClicks: eventCounts.click_shopee || 0, tiktokClicks: eventCounts.click_tiktok_shop || 0, whatsappClicks: eventCounts.click_whatsapp_product || 0, commercialClicks, ctr: productViews ? commercialClicks / productViews : 0 }, channels: (channelData.rows || []).map((row) => ({ channel: row.dimensionValues?.[0]?.value || 'Outros', sourceMedium: row.dimensionValues?.[1]?.value || '(direct) / (none)', users: num(row, 0), sessions: num(row, 1), share: channelSessions ? num(row, 1) / channelSessions : 0 })), products: commercialProducts, searchConsole, recentEvents: realtime.events, clarity, health: [
    { provider: 'GA4', status: 'active', detail: productViews || commercialClicks ? 'Conectado' : 'Conectado, sem eventos de produto no período' }, { provider: 'Search Console', status: searchConsole.status === 'ok' ? 'active' : searchConsole.status === 'empty' ? 'waiting' : 'error', detail: searchConsole.status === 'ok' ? 'Conectado' : searchConsole.status === 'empty' ? 'Conectado, sem dados no período' : 'Erro na integração' }, { provider: 'Google Tag Manager', status: /^GTM-[A-Z0-9]+$/.test(process.env.VITE_GTM_ID || '') ? 'active' : 'missing', detail: /^GTM-[A-Z0-9]+$/.test(process.env.VITE_GTM_ID || '') ? 'Publicado; eventos recentes abaixo' : 'Não configurado' }, { provider: 'Microsoft Clarity', status: clarity.available && clarity.hasData ? 'active' : clarity.available ? 'waiting' : clarity.configured ? 'error' : 'missing', detail: clarity.available && clarity.hasData ? 'Ativo, com sessões recentes' : clarity.message || 'Não configurado' },
  ] }
}
