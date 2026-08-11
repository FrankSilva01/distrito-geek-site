// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { guidePerformanceFrom, lowCtrFrom, pagePath, searchTermsFrom, seoBandsFrom, settleSearchConsole, settleSearchConsoleRequests } from '../../netlify/functions/_shared/google-analytics'

const row = (query: string, page: string, clicks: number, impressions: number, position: number) => ({ query, page, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position })

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

  it('extrai o caminho de páginas do Search Console, sejam URL ou path', () => {
    expect(pagePath('https://distritogeek.com.br/guias/tokens-rpg')).toBe('/guias/tokens-rpg')
    expect(pagePath('/guias/tokens-rpg')).toBe('/guias/tokens-rpg')
    expect(pagePath('guias/x')).toBe('/guias/x')
    expect(pagePath('')).toBe('')
  })

  it('agrega o desempenho apenas das páginas de guia, numa única passagem', () => {
    const rows = [
      row('tokens rpg', 'https://distritogeek.com.br/guias/tokens-rpg', 4, 100, 6),
      row('token de rpg', 'https://distritogeek.com.br/guias/tokens-rpg', 1, 50, 8),
      row('miniaturas rpg', 'https://distritogeek.com.br/miniaturas-rpg', 2, 80, 5),
    ]
    const guides = guidePerformanceFrom(rows)
    expect(guides).toHaveLength(1)
    expect(guides[0]).toMatchObject({ page: '/guias/tokens-rpg', clicks: 5, impressions: 150 })
    // Posição ponderada por impressões: (6*100 + 8*50)/150 = 6.67
    expect(guides[0].position).toBeCloseTo(6.6667, 3)
  })

  it('monta termos de pesquisa com a landing de mais impressões da query', () => {
    const rows = [
      row('miniaturas rpg', 'https://distritogeek.com.br/miniaturas-rpg', 3, 120, 4),
      row('miniaturas rpg', 'https://distritogeek.com.br/', 1, 20, 9),
    ]
    const terms = searchTermsFrom(rows)
    expect(terms).toHaveLength(1)
    expect(terms[0]).toMatchObject({ query: 'miniaturas rpg', landingPage: '/miniaturas-rpg', clicks: 4, impressions: 140 })
  })

  it('classifica queries em faixas de posição, ordenando por impressões', () => {
    const terms = searchTermsFrom([
      row('defender', '/a', 10, 200, 2),
      row('top3', '/b', 3, 300, 7),
      row('primeira', '/c', 1, 150, 15),
      row('secundaria', '/d', 0, 90, 30),
      row('fora', '/e', 0, 40, 60),
    ])
    const bands = seoBandsFrom(terms)
    expect(bands.map((band) => band.id)).toEqual(['defender', 'top-3', 'primeira-pagina', 'secundaria'])
    expect(bands[0].queries.map((q) => q.query)).toEqual(['defender'])
    expect(bands[1].queries.map((q) => q.query)).toEqual(['top3'])
    // Posição 60 fica fora de todas as faixas (máximo é 40).
    expect(bands.flatMap((band) => band.queries).map((q) => q.query)).not.toContain('fora')
  })

  it('sinaliza CTR baixo só com boa posição e volume real', () => {
    const terms = searchTermsFrom([
      row('bom volume ctr baixo', '/guias/x', 2, 300, 5),
      row('pouca impressao', '/guias/y', 0, 5, 4),
      row('ctr alto', '/guias/z', 40, 200, 6),
    ])
    const low = lowCtrFrom(terms)
    expect(low.map((item) => item.query)).toEqual(['bom volume ctr baixo'])
    expect(low[0].suggestion).toMatch(/title|description|inten/i)
  })

  it('expõe os novos blocos vazios quando o período não tem dados', async () => {
    const empty = await settleSearchConsole(Promise.resolve({ rows: [] }))
    expect(empty.guidePerformance).toEqual([])
    expect(empty.searchTerms).toEqual([])
    expect(empty.lowCtr).toEqual([])
    // As faixas mantêm a estrutura, mas sem nenhuma query dentro.
    expect(empty.seoBands.every((band) => band.queries.length === 0)).toBe(true)
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
