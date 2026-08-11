import { createSign } from 'node:crypto'
import { clarityInsights } from './clarity'

const base64url = (value: string) => Buffer.from(value).toString('base64url')
const allowedPeriods = new Set([7, 28, 90])
type GoogleRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }
type GoogleReport = { rows?: GoogleRow[]; totals?: GoogleRow[] }
export type RecentEvent = { name: string; count: number; minutesAgo: number; lastSeenAt: string }
type SearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
type SearchReport = { rows?: SearchRow[]; unavailable?: boolean }
type SearchItem = { label: string; clicks: number; impressions: number; ctr: number; position: number }
/**
 * `ok` = respondeu com linhas. `empty` = respondeu 200 sem linhas, que é o normal para
 * site novo ou período ainda não consolidado. `error` = falha real de API, permissão ou
 * autenticação. Nunca colapsar `error` em zero: o painel precisa mostrar coisas diferentes.
 */
export type IntegrationStatus = 'ok' | 'empty' | 'error'
type SearchConsoleResult = { available: boolean; status: IntegrationStatus; totals: { clicks: number; impressions: number; ctr: number; position: number }; rows: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>; topQueries: SearchItem[]; topPages: SearchItem[]; opportunities: Array<SearchItem & { kind: string; previousClicks?: number }>; message?: string }

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
async function realtimeReport(token: string, property: string): Promise<GoogleReport> {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runRealtimeReport`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ dimensions: [{ name: 'eventName' }, { name: 'minutesAgo' }], metrics: [{ name: 'eventCount' }], limit: 100 }) })
  if (!response.ok) throw new Error(`GA4 Realtime HTTP ${response.status}`)
  return response.json() as Promise<GoogleReport>
}
const num = (row: GoogleRow | undefined, index: number) => Number(row?.metricValues?.[index]?.value || 0)
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
    return { available: true, status: rows.length ? 'ok' : 'empty', totals: { clicks: totals.clicks, impressions: totals.impressions, ctr: totals.impressions ? totals.clicks / totals.impressions : 0, position: totals.impressions ? totals.weighted / totals.impressions : 0 }, rows: rows.slice(0, 30), topQueries: topQueries.slice(0, 10), topPages: topPages.slice(0, 10), opportunities, message: rows.length ? undefined : 'Conectado, sem dados para este período. O Search Console leva alguns dias para consolidar.' }
  } catch { return { available: false, status: 'error', totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, rows: [], topQueries: [], topPages: [], opportunities: [], message: 'Não foi possível consultar o Search Console. Verifique a permissão da conta de serviço na propriedade.' } }
}
export function settleSearchConsoleRequests(current: Promise<SearchReport>, previous: Promise<SearchReport>): [Promise<SearchReport>, Promise<SearchReport>] {
  return [current.catch(() => ({ rows: [], unavailable: true })), previous.catch(() => ({ rows: [] }))]
}
const searchRequest = (token: string, siteUrl: string, startDate: string, endDate: string) => fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ startDate, endDate, dimensions: ['query', 'page'], rowLimit: 250 }) }).then(async (response) => { if (!response.ok) throw new Error(`Search Console HTTP ${response.status}`); return response.json() as Promise<SearchReport> })

export async function acquisitionReport(rawPeriod = 28) {
  const property = process.env.GA4_PROPERTY_ID, siteUrl = process.env.SEARCH_CONSOLE_SITE_URL, { clientEmail, privateKey } = credentials()
  if (!property || !siteUrl || !clientEmail || !privateKey) return { configured: false as const, missing: [!property && 'GA4_PROPERTY_ID', !siteUrl && 'SEARCH_CONSOLE_SITE_URL', !clientEmail && 'GA4_CLIENT_EMAIL', !privateKey && 'GA4_PRIVATE_KEY_B64'].filter(Boolean) }
  const period = allowedPeriods.has(rawPeriod) ? rawPeriod : 28, dateRanges = [{ startDate: `${period}daysAgo`, endDate: 'today' }], token = await accessToken(), now = Date.now(), day = 86400000
  const currentStart = new Date(now - period * day).toISOString().slice(0, 10), currentEnd = new Date(now).toISOString().slice(0, 10), previousStart = new Date(now - period * 2 * day).toISOString().slice(0, 10), previousEnd = new Date(now - (period + 1) * day).toISOString().slice(0, 10)
  const [currentSearch, previousSearch] = settleSearchConsoleRequests(searchRequest(token, siteUrl, currentStart, currentEnd), searchRequest(token, siteUrl, previousStart, previousEnd))
  const [totalsData, channelData, eventData, productData, productClickData, searchConsole, realtime, clarity] = await Promise.all([
    gaReport(token, property, { dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'sessionSourceMedium' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 30 }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['view_item', 'click_mercado_livre', 'click_shopee'] } } } }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/produto/' } } }, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 25 }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'eventName' }, { name: 'pagePath' }], metrics: [{ name: 'eventCount' }], dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['click_mercado_livre', 'click_shopee'] } } }, limit: 100 }).catch(() => ({ rows: [] })),
    settleSearchConsole(currentSearch, previousSearch), settleRealtime(realtimeReport(token, property)), clarityInsights(period),
  ])
  const totalRow = totalsData.rows?.[0] || totalsData.totals?.[0], eventCounts = Object.fromEntries((eventData.rows || []).map((row) => [row.dimensionValues?.[0]?.value || '', num(row, 0)])), productViews = eventCounts.view_item || 0, marketplaceClicks = (eventCounts.click_mercado_livre || 0) + (eventCounts.click_shopee || 0), channelSessions = (channelData.rows || []).reduce((sum, row) => sum + num(row, 1), 0)
  const clicksByPath = new Map<string, { ml: number; shopee: number }>(); (productClickData.rows || []).forEach((row) => { const event = row.dimensionValues?.[0]?.value, path = row.dimensionValues?.[1]?.value || '', clicks = clicksByPath.get(path) || { ml: 0, shopee: 0 }; if (event === 'click_shopee') clicks.shopee += num(row, 0); else clicks.ml += num(row, 0); clicksByPath.set(path, clicks) })
  return { configured: true as const, period, generatedAt: new Date().toISOString(), totals: { users: num(totalRow, 0), sessions: num(totalRow, 1), pageViews: num(totalRow, 2), productViews, mercadoLivreClicks: eventCounts.click_mercado_livre || 0, shopeeClicks: eventCounts.click_shopee || 0, ctr: productViews ? marketplaceClicks / productViews : 0 }, channels: (channelData.rows || []).map((row) => ({ channel: row.dimensionValues?.[0]?.value || 'Outros', sourceMedium: row.dimensionValues?.[1]?.value || '(direct) / (none)', users: num(row, 0), sessions: num(row, 1), share: channelSessions ? num(row, 1) / channelSessions : 0 })), products: (productData.rows || []).map((row) => { const path = row.dimensionValues?.[0]?.value || '', clicks = clicksByPath.get(path) || { ml: 0, shopee: 0 }, views = num(row, 0); return { path, title: row.dimensionValues?.[1]?.value || 'Produto', views, users: num(row, 1), mercadoLivreClicks: clicks.ml, shopeeClicks: clicks.shopee, externalCtr: views ? (clicks.ml + clicks.shopee) / views : 0 } }), searchConsole, recentEvents: realtime.events, clarity, health: [
    { provider: 'GA4', status: 'active', detail: productViews || marketplaceClicks ? 'Conectado' : 'Conectado, sem eventos de produto no período' }, { provider: 'Search Console', status: searchConsole.status === 'ok' ? 'active' : searchConsole.status === 'empty' ? 'waiting' : 'error', detail: searchConsole.status === 'ok' ? 'Conectado' : searchConsole.status === 'empty' ? 'Conectado, sem dados no período' : 'Erro na integração' }, { provider: 'Google Tag Manager', status: /^GTM-[A-Z0-9]+$/.test(process.env.VITE_GTM_ID || '') ? 'active' : 'missing', detail: /^GTM-[A-Z0-9]+$/.test(process.env.VITE_GTM_ID || '') ? 'Publicado' : 'Não configurado' }, { provider: 'Microsoft Clarity', status: clarity.available ? 'active' : clarity.configured ? 'error' : 'missing', detail: clarity.available ? 'Ativo' : clarity.message || 'Não configurado' },
  ] }
}
