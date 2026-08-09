import { createSign } from 'node:crypto'

const base64url = (value: string) => Buffer.from(value).toString('base64url')
const allowedPeriods = new Set([7, 28, 90])
type GoogleRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }
type GoogleReport = { rows?: GoogleRow[]; totals?: GoogleRow[] }
type SearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
type SearchReport = { rows?: SearchRow[] }
type SearchConsoleResult = {
  available: boolean
  totals: { clicks: number; impressions: number }
  rows: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>
  opportunities: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>
  message?: string
}

function credentials() {
  const clientEmail = process.env.GA4_CLIENT_EMAIL
  const encodedKey = process.env.GA4_PRIVATE_KEY_B64
  const legacyKey = process.env.GA4_PRIVATE_KEY
  return { clientEmail, privateKey: encodedKey ? Buffer.from(encodedKey, 'base64').toString('utf8') : legacyKey }
}

async function accessToken() {
  const { clientEmail, privateKey } = credentials()
  if (!clientEmail || !privateKey) throw new Error('Credenciais Google não configuradas.')
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: clientEmail, scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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
const num = (row: GoogleRow | undefined, index: number) => Number(row?.metricValues?.[index]?.value || 0)

export async function settleSearchConsole(request: Promise<SearchReport>): Promise<SearchConsoleResult> {
  try {
    const data = await request
    const rows = (data.rows || []).map((row) => ({ query: row.keys?.[0] || '', page: row.keys?.[1] || '', clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 }))
    return {
      available: true,
      totals: rows.reduce((acc, row) => ({ clicks: acc.clicks + row.clicks, impressions: acc.impressions + row.impressions }), { clicks: 0, impressions: 0 }),
      rows: rows.slice(0, 30),
      opportunities: rows.filter((row) => row.impressions >= 10 && row.ctr < 0.03 && row.position <= 20).slice(0, 10),
    }
  } catch {
    return { available: false, totals: { clicks: 0, impressions: 0 }, rows: [], opportunities: [], message: 'Os dados do Search Console ainda não estão disponíveis. O restante do relatório continua funcionando.' }
  }
}

export async function acquisitionReport(rawPeriod = 28) {
  const property = process.env.GA4_PROPERTY_ID, siteUrl = process.env.SEARCH_CONSOLE_SITE_URL
  const { clientEmail, privateKey } = credentials()
  if (!property || !siteUrl || !clientEmail || !privateKey) return { configured: false as const, missing: [!property && 'GA4_PROPERTY_ID', !siteUrl && 'SEARCH_CONSOLE_SITE_URL', !clientEmail && 'GA4_CLIENT_EMAIL', !privateKey && 'GA4_PRIVATE_KEY_B64'].filter(Boolean) }
  const period = allowedPeriods.has(rawPeriod) ? rawPeriod : 28
  const dateRanges = [{ startDate: `${period}daysAgo`, endDate: 'today' }]
  const token = await accessToken()
  const [totalsData, channelData, eventData, productData, searchConsole] = await Promise.all([
    gaReport(token, property, { dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 20 }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['view_product', 'click_mercado_livre', 'click_shopee'] } } } }),
    gaReport(token, property, { dateRanges, dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/produto/' } } }, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 25 }),
    settleSearchConsole(fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ startDate: new Date(Date.now() - period * 86400000).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), dimensions: ['query', 'page'], rowLimit: 100 }) }).then(async (response) => { if (!response.ok) throw new Error(`Search Console HTTP ${response.status}`); return response.json() as Promise<SearchReport> })),
  ])
  const totalRow = totalsData.rows?.[0] || totalsData.totals?.[0]
  const eventCounts = Object.fromEntries((eventData.rows || []).map((row) => [row.dimensionValues?.[0]?.value || '', num(row, 0)]))
  const productViews = eventCounts.view_product || 0, marketplaceClicks = (eventCounts.click_mercado_livre || 0) + (eventCounts.click_shopee || 0)
  return {
    configured: true as const, period, generatedAt: new Date().toISOString(),
    totals: { users: num(totalRow, 0), sessions: num(totalRow, 1), pageViews: num(totalRow, 2), productViews, mercadoLivreClicks: eventCounts.click_mercado_livre || 0, shopeeClicks: eventCounts.click_shopee || 0, ctr: productViews ? marketplaceClicks / productViews : 0 },
    channels: (channelData.rows || []).map((row) => ({ channel: row.dimensionValues?.[0]?.value || 'Outros', users: num(row, 0), sessions: num(row, 1) })),
    products: (productData.rows || []).map((row) => ({ path: row.dimensionValues?.[0]?.value || '', title: row.dimensionValues?.[1]?.value || 'Produto', views: num(row, 0), users: num(row, 1) })),
    searchConsole,
  }
}
