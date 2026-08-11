// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { settleSearchConsole, settleSearchConsoleRequests } from '../../netlify/functions/_shared/google-analytics'

describe('analytics provider isolation', () => {
  it('reports a real failure as an error, never as zeros', async () => {
    const result = await settleSearchConsole(Promise.reject(new Error('forbidden')))

    expect(result.status).toBe('error')
    expect(result.available).toBe(false)
    expect(result.totals).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 })
    expect(result.message).toMatch(/não foi possível consultar/i)
  })

  // Site novo responde 200 sem linhas. Isso nao e falha e nao pode aparecer como tal.
  it('separates an empty period from a broken integration', async () => {
    const empty = await settleSearchConsole(Promise.resolve({ rows: [] }))
    expect(empty.status).toBe('empty')
    expect(empty.available).toBe(true)
    expect(empty.totals.impressions).toBe(0)
    expect(empty.message).toMatch(/sem dados para este per/i)

    const withData = await settleSearchConsole(Promise.resolve({ rows: [{ keys: ['miniaturas rpg', 'https://distritogeek.com.br/'], clicks: 2, impressions: 40, ctr: 0.05, position: 8.4 }] }))
    expect(withData.status).toBe('ok')
    expect(withData.totals).toEqual({ clicks: 2, impressions: 40, ctr: 0.05, position: 8.4 })
    expect(withData.message).toBeUndefined()
  })

  it('settles current and previous Search Console failures without leaving a rejected promise', async () => {
    const [current, previous] = settleSearchConsoleRequests(
      Promise.reject(new Error('Search Console HTTP 403 current')),
      Promise.reject(new Error('Search Console HTTP 403 previous')),
    )
    const result = await settleSearchConsole(current, previous)

    expect(result.available).toBe(false)
    await expect(previous).resolves.toEqual({ rows: [] })
  })
})
