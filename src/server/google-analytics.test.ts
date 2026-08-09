// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { settleSearchConsole } from '../../netlify/functions/_shared/google-analytics'

describe('analytics provider isolation', () => {
  it('keeps the analytics report available when Search Console rejects the query', async () => {
    const result = await settleSearchConsole(Promise.reject(new Error('forbidden')))

    expect(result).toEqual({
      available: false,
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      rows: [],
      topQueries: [],
      topPages: [],
      opportunities: [],
      message: 'Os dados do Search Console ainda não estão disponíveis. O restante do relatório continua funcionando.',
    })
  })
})
