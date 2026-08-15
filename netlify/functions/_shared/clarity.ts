import { getStore } from '@netlify/blobs'

type ClarityMetric = { metricName?: string; information?: Array<Record<string, unknown>> }
export type ClarityMetrics = { sessions: number; users: number; pagesPerSession: number; scrollDepth: number; engagementTimeSeconds: number; deadClicks: number; rageClicks: number; quickbacks: number; scriptErrors: number }
export type ClarityResult = ClarityMetrics & { configured: boolean; available: boolean; hasData: boolean; periodDays: number; message?: string }

const emptyMetrics = (): ClarityMetrics => ({ sessions: 0, users: 0, pagesPerSession: 0, scrollDepth: 0, engagementTimeSeconds: 0, deadClicks: 0, rageClicks: 0, quickbacks: 0, scriptErrors: 0 })
const number = (value: unknown) => Number(value || 0)

export function normalizeClarityInsights(metrics: ClarityMetric[]): ClarityMetrics {
  const key = (value = '') => value.replace(/[\s_-]/g, '').toLowerCase()
  const information = (...names: string[]) => metrics.find((metric) => names.some((name) => key(metric.metricName) === key(name)))?.information || []
  const first = (...names: string[]) => information(...names)[0] || {}
  const traffic = first('Traffic')
  return {
    sessions: number(traffic.totalSessionCount),
    users: number(traffic.distinctUserCount ?? traffic.distantUserCount),
    pagesPerSession: number(traffic.pagesPerSession ?? traffic.PagesPerSessionPercentage),
    scrollDepth: number(first('Scroll Depth', 'ScrollDepth').scrollDepth ?? first('Scroll Depth', 'ScrollDepth').averageScrollDepth),
    engagementTimeSeconds: number(first('Engagement Time', 'EngagementTime').engagementTime ?? first('Engagement Time', 'EngagementTime').activeTime ?? first('Engagement Time', 'EngagementTime').totalTime),
    deadClicks: number(first('Dead Click Count', 'DeadClickCount').deadClickCount ?? first('Dead Click Count', 'DeadClickCount').sessionsCount),
    rageClicks: number(first('Rage Click Count', 'RageClickCount').rageClickCount ?? first('Rage Click Count', 'RageClickCount').sessionsCount),
    quickbacks: number(first('Quickback Click', 'QuickbackClick').quickbackClickCount ?? first('Quickback Click', 'QuickbackClick').quickbackClick ?? first('Quickback Click', 'QuickbackClick').sessionsCount),
    scriptErrors: number(first('Script Error Count', 'ScriptErrorCount').scriptErrorCount ?? first('Script Error Count', 'ScriptErrorCount').sessionsCount),
  }
}

export async function clarityInsights(rawPeriod: number): Promise<ClarityResult> {
  const periodDays = Math.max(1, Math.min(3, rawPeriod))
  const token = process.env.CLARITY_API_TOKEN
  if (!token) return { configured: false, available: false, hasData: false, periodDays, ...emptyMetrics(), message: 'Token de exportação do Clarity ainda não configurado.' }
  const store = getStore('distrito-geek-analytics')
  const cacheKey = `clarity-live-${periodDays}`
  const cached = await store.get(cacheKey, { type: 'json' }).catch(() => null) as { fetchedAt?: string; metrics?: ClarityMetrics } | null
  if (cached?.fetchedAt && cached.metrics && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000) return { configured: true, available: true, hasData: cached.metrics.sessions > 0, periodDays, ...cached.metrics, message: cached.metrics.sessions ? undefined : 'Conectado, mas o Clarity não retornou sessões nos últimos 3 dias.' }
  try {
    const url = new URL('https://www.clarity.ms/export-data/api/v1/project-live-insights')
    url.searchParams.set('numOfDays', String(periodDays))
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } })
    if (!response.ok) throw new Error(`Clarity HTTP ${response.status}`)
    const payload = await response.json()
    const metrics = normalizeClarityInsights(Array.isArray(payload) ? payload : [])
    await store.setJSON(cacheKey, { fetchedAt: new Date().toISOString(), metrics }).catch(() => undefined)
    return { configured: true, available: true, hasData: metrics.sessions > 0, periodDays, ...metrics, message: metrics.sessions ? undefined : 'Conectado, mas o Clarity não retornou sessões nos últimos 3 dias.' }
  } catch (error) {
    if (cached?.metrics) return { configured: true, available: true, hasData: cached.metrics.sessions > 0, periodDays, ...cached.metrics, message: 'Exibindo a última leitura disponível do Clarity.' }
    const forbidden = error instanceof Error && /Clarity HTTP (401|403)/.test(error.message)
    return { configured: true, available: false, hasData: false, periodDays, ...emptyMetrics(), message: forbidden ? 'O token Data Export do Clarity foi recusado. Gere um novo token no projeto e atualize CLARITY_API_TOKEN na Netlify.' : 'O Clarity está temporariamente indisponível.' }
  }
}
