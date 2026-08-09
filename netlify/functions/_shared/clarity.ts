import { getStore } from '@netlify/blobs'

type ClarityMetric = { metricName?: string; information?: Array<Record<string, unknown>> }
export type ClarityMetrics = { sessions: number; users: number; pagesPerSession: number; scrollDepth: number; engagementTimeSeconds: number; deadClicks: number; rageClicks: number; quickbacks: number; scriptErrors: number }
export type ClarityResult = ClarityMetrics & { configured: boolean; available: boolean; periodDays: number; message?: string }

const emptyMetrics = (): ClarityMetrics => ({ sessions: 0, users: 0, pagesPerSession: 0, scrollDepth: 0, engagementTimeSeconds: 0, deadClicks: 0, rageClicks: 0, quickbacks: 0, scriptErrors: 0 })
const number = (value: unknown) => Number(value || 0)

export function normalizeClarityInsights(metrics: ClarityMetric[]): ClarityMetrics {
  const information = (name: string) => metrics.find((metric) => metric.metricName?.toLowerCase() === name.toLowerCase())?.information || []
  const first = (name: string) => information(name)[0] || {}
  const traffic = first('Traffic')
  return {
    sessions: number(traffic.totalSessionCount),
    users: number(traffic.distinctUserCount ?? traffic.distantUserCount),
    pagesPerSession: number(traffic.pagesPerSession ?? traffic.PagesPerSessionPercentage),
    scrollDepth: number(first('Scroll Depth').scrollDepth),
    engagementTimeSeconds: number(first('Engagement Time').engagementTime ?? first('Engagement Time').activeTime),
    deadClicks: number(first('Dead Click Count').deadClickCount),
    rageClicks: number(first('Rage Click Count').rageClickCount),
    quickbacks: number(first('Quickback Click').quickbackClickCount ?? first('Quickback Click').quickbackClick),
    scriptErrors: number(first('Script Error Count').scriptErrorCount),
  }
}

export async function clarityInsights(rawPeriod: number): Promise<ClarityResult> {
  const periodDays = Math.max(1, Math.min(3, rawPeriod))
  const token = process.env.CLARITY_API_TOKEN
  if (!token) return { configured: false, available: false, periodDays, ...emptyMetrics(), message: 'Token de exportação do Clarity ainda não configurado.' }
  const store = getStore('distrito-geek-analytics')
  const cacheKey = `clarity-live-${periodDays}`
  const cached = await store.get(cacheKey, { type: 'json' }).catch(() => null) as { fetchedAt?: string; metrics?: ClarityMetrics } | null
  if (cached?.fetchedAt && cached.metrics && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000) return { configured: true, available: true, periodDays, ...cached.metrics }
  try {
    const url = new URL('https://www.clarity.ms/export-data/api/v1/project-live-insights')
    url.searchParams.set('numOfDays', String(periodDays))
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } })
    if (!response.ok) throw new Error(`Clarity HTTP ${response.status}`)
    const payload = await response.json()
    const metrics = normalizeClarityInsights(Array.isArray(payload) ? payload : [])
    await store.setJSON(cacheKey, { fetchedAt: new Date().toISOString(), metrics }).catch(() => undefined)
    return { configured: true, available: true, periodDays, ...metrics }
  } catch {
    if (cached?.metrics) return { configured: true, available: true, periodDays, ...cached.metrics, message: 'Exibindo a última leitura disponível do Clarity.' }
    return { configured: true, available: false, periodDays, ...emptyMetrics(), message: 'O Clarity está temporariamente indisponível.' }
  }
}
