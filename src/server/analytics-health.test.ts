// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalizeClarityInsights } from '../../netlify/functions/_shared/clarity'
import { normalizeRealtimeEvents } from '../../netlify/functions/_shared/google-analytics'

describe('analytics health data', () => {
  it('normalizes Clarity live insights without exposing raw provider data', () => {
    const result = normalizeClarityInsights([
      { metricName: 'Traffic', information: [{ totalSessionCount: '12', distinctUserCount: '8', pagesPerSession: 1.5 }] },
      { metricName: 'Scroll Depth', information: [{ scrollDepth: 64.25 }] },
      { metricName: 'Engagement Time', information: [{ engagementTime: 83 }] },
      { metricName: 'Dead Click Count', information: [{ deadClickCount: '2' }] },
      { metricName: 'Rage Click Count', information: [{ rageClickCount: '1' }] },
      { metricName: 'Quickback Click', information: [{ quickbackClickCount: '3' }] },
      { metricName: 'Script Error Count', information: [{ scriptErrorCount: '4' }] },
    ])

    expect(result).toEqual({ sessions: 12, users: 8, pagesPerSession: 1.5, scrollDepth: 64.25, engagementTimeSeconds: 83, deadClicks: 2, rageClicks: 1, quickbacks: 3, scriptErrors: 4 })
  })

  it('converts GA4 realtime rows into recent GTM events', () => {
    const result = normalizeRealtimeEvents({ rows: [
      { dimensionValues: [{ value: 'view_product' }, { value: '2' }], metricValues: [{ value: '3' }] },
      { dimensionValues: [{ value: 'page_view' }, { value: '0' }], metricValues: [{ value: '7' }] },
    ] }, new Date('2026-08-09T12:00:00.000Z'))

    expect(result).toEqual([
      { name: 'page_view', count: 7, minutesAgo: 0, lastSeenAt: '2026-08-09T12:00:00.000Z' },
      { name: 'view_product', count: 3, minutesAgo: 2, lastSeenAt: '2026-08-09T11:58:00.000Z' },
    ])
  })
})
