// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { commercialProductRowsFrom } from '../../netlify/functions/_shared/google-analytics'
import { classifyLanding, clusterViewFrom, commercialDimensionFilter, contentGapsFrom, guideFunnelFrom, guidePerformanceFrom, guideSlugFromPath, lowCtrFrom, organicLandingsFrom, pagePath, productAnalyticsTitle, productPageViewsFrom, searchSignalsFrom, searchTermsFrom, seoBandsFrom, settleSearchConsole, settleSearchConsoleRequests, sumDualRange, sumDualRangeEvent, trend } from '../../netlify/functions/_shared/google-analytics'

const row = (query: string, page: string, clicks: number, impressions: number, position: number) => ({ query, page, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position })

describe('analytics provider isolation', () => {
  it('agrega buscas internas sem somar usuários por minuto e usa ocorrência real', () => {
    const summary = { rows: [
      { dimensionValues: [{ value: 'Órcs' }], metricValues: [{ value: '7' }, { value: '3' }, { value: '4' }] },
      { dimensionValues: [{ value: 'orcs' }], metricValues: [{ value: '2' }, { value: '1' }, { value: '1' }] },
    ] }
    const occurrences = { rows: [
      { dimensionValues: [{ value: 'Órcs' }, { value: '202608151830' }], metricValues: [{ value: '3' }] },
      { dimensionValues: [{ value: 'orcs' }, { value: '202608151845' }], metricValues: [{ value: '2' }] },
    ] }
    expect(searchSignalsFrom(summary, occurrences)).toEqual([{
      normalizedTerm: 'orc', variants: ['Órcs', 'orcs'], searches: 9, users: 4, sessions: 5,
      lastOccurredAt: '2026-08-15T18:45:00',
    }])
  })

  it('ignora ruído técnico sem apagar buscas comerciais de baixa frequência', () => {
    const summary = { rows: [
      { dimensionValues: [{ value: '/admin' }], metricValues: [{ value: '9' }, { value: '1' }, { value: '1' }] },
      { dimensionValues: [{ value: '(not set)' }], metricValues: [{ value: '7' }, { value: '1' }, { value: '1' }] },
      { dimensionValues: [{ value: 'https://tagassistant.google.com/' }], metricValues: [{ value: '5' }, { value: '1' }, { value: '1' }] },
      { dimensionValues: [{ value: 'necromante' }], metricValues: [{ value: '1' }, { value: '1' }, { value: '1' }] },
    ] }
    const occurrences = { rows: [{ dimensionValues: [{ value: 'necromante' }, { value: '202608150900' }], metricValues: [{ value: '1' }] }] }
    expect(searchSignalsFrom(summary, occurrences).map((item) => item.normalizedTerm)).toEqual(['necromante'])
  })
  it('limits commercial KPIs to the canonical public site and excludes admin and Tag Assistant traffic', () => {
    const filter = JSON.stringify(commercialDimensionFilter())
    expect(filter).toContain('distritogeek.com.br')
    expect(filter).toContain('/admin')
    expect(filter).toContain('tagassistant.google.com')
    const landingFilter = JSON.stringify(commercialDimensionFilter(undefined, 'landingPagePlusQueryString'))
    expect(landingFilter).toContain('landingPagePlusQueryString')
    expect(landingFilter).toContain('gtm_debug')
  })
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

  it('classifica landings por tipo a partir do caminho', () => {
    expect(classifyLanding('/guias/tokens-rpg')).toBe('guide')
    expect(classifyLanding('/produto/kit-x')).toBe('product')
    expect(classifyLanding('/categoria/miniaturas-rpg')).toBe('category')
    expect(classifyLanding('/miniaturas-dnd')).toBe('category')
    expect(classifyLanding('/')).toBe('other')
    expect(guideSlugFromPath('/guias/tokens-rpg')).toBe('tokens-rpg')
  })

  it('monta o funil editorial por guia com CTR guia→produto', () => {
    const funnel = guideFunnelFrom([
      { event: 'guide_view', slug: 'tokens-rpg', count: 100 },
      { event: 'guide_product_click', slug: 'tokens-rpg', count: 20 },
      { event: 'guide_category_click', slug: 'tokens-rpg', count: 8 },
      { event: 'guide_related_click', slug: 'tokens-rpg', count: 5 },
      { event: 'guide_view', slug: '', count: 999 },
    ])
    expect(funnel).toHaveLength(1)
    expect(funnel[0]).toMatchObject({ slug: 'tokens-rpg', cluster: 'acessorios', views: 100, productClicks: 20, categoryClicks: 8, relatedClicks: 5 })
    expect(funnel[0].productCtr).toBeCloseTo(0.2, 5)
  })

  it('agrupa a visão por cluster sem deixar cluster de fora', () => {
    const funnel = guideFunnelFrom([{ event: 'guide_view', slug: 'goblins-rpg', count: 30 }, { event: 'guide_product_click', slug: 'goblins-rpg', count: 6 }])
    const clusters = clusterViewFrom(funnel, [{ page: '/guias/goblins-rpg', clicks: 4, impressions: 200, ctr: 0.02, position: 7 }], [{ path: '/guias/goblins-rpg', kind: 'guide', users: 10, sessions: 12, clicks: 4, impressions: 200, ctr: 0.02, position: 7 }])
    const criaturas = clusters.find((c) => c.cluster === 'criaturas')!
    expect(criaturas).toMatchObject({ guideViews: 30, productClicks: 6, impressions: 200, clicks: 4, organicEntrances: 12 })
    // Todos os sete clusters aparecem, mesmo os zerados.
    expect(clusters).toHaveLength(7)
    expect(clusters.find((c) => c.cluster === 'pathfinder')).toMatchObject({ guideViews: 0, impressions: 0 })
  })

  it('cruza landings orgânicas do GA com clicks e impressões do Search Console', () => {
    const rows = [{ dimensionValues: [{ value: '/guias/tokens-rpg?utm=x' }], metricValues: [{ value: '9' }, { value: '11' }] }]
    const landings = organicLandingsFrom(rows, [{ page: '/guias/tokens-rpg', clicks: 3, impressions: 120, ctr: 0.025, position: 6 }], new Map())
    expect(landings).toHaveLength(1)
    expect(landings[0]).toMatchObject({ path: '/guias/tokens-rpg', kind: 'guide', users: 9, sessions: 11, clicks: 3, impressions: 120 })
  })

  it('remove admin e debug das landings comerciais mesmo em dados históricos', () => {
    const rows = [
      { dimensionValues: [{ value: '/admin' }], metricValues: [{ value: '2' }, { value: '3' }] },
      { dimensionValues: [{ value: '/admin/produtos' }], metricValues: [{ value: '1' }, { value: '1' }] },
      { dimensionValues: [{ value: '/?gtm_debug=x' }], metricValues: [{ value: '1' }, { value: '1' }] },
      { dimensionValues: [{ value: '/produto/mago' }], metricValues: [{ value: '4' }, { value: '6' }] },
    ]
    expect(organicLandingsFrom(rows, [], new Map()).map((item) => item.path)).toEqual(['/produto/mago'])
  })

  it('soma visualizações de produto com a mesma métrica usada na tabela', () => {
    const rows = [
      { dimensionValues: [{ value: '/produto/mago' }], metricValues: [{ value: '4' }, { value: '2' }] },
      { dimensionValues: [{ value: '/produto/orc' }], metricValues: [{ value: '7' }, { value: '3' }] },
    ]
    expect(productPageViewsFrom(rows)).toBe(11)
  })

  it('agrega cliques comerciais por produto e mantém os canais separados', () => {
    const products = { rows: [
      { dimensionValues: [{ value: '/produto/mago' }, { value: 'Mago | Distrito Geek' }], metricValues: [{ value: '20' }, { value: '12' }] },
    ] }
    const clicks = { rows: [
      { dimensionValues: [{ value: 'click_mercado_livre' }, { value: '/produto/mago' }], metricValues: [{ value: '4' }] },
      { dimensionValues: [{ value: 'click_shopee' }, { value: '/produto/mago' }], metricValues: [{ value: '2' }] },
      { dimensionValues: [{ value: 'click_tiktok_shop' }, { value: '/produto/mago' }], metricValues: [{ value: '1' }] },
      { dimensionValues: [{ value: 'click_whatsapp_product' }, { value: '/produto/mago' }], metricValues: [{ value: '3' }] },
    ] }

    expect(commercialProductRowsFrom(products, clicks)).toEqual([{
      path: '/produto/mago', title: 'Mago | Distrito Geek', views: 20, users: 12,
      mercadoLivreClicks: 4, shopeeClicks: 2, tiktokClicks: 1, whatsappClicks: 3,
      totalCommercialClicks: 10, commercialCtr: 0.5,
    }])
  })

  it('não exibe o title genérico da Home como nome de produto', () => {
    expect(productAnalyticsTitle('/produto/gaveta-oculta-para-mesa-mlb4760837171', 'Distrito Geek | Miniaturas RPG, Action Figures e Colecionáveis')).toBe('Gaveta oculta para mesa')
    expect(productAnalyticsTitle('/produto/kit-5-aventureiros-mlb123', 'Kit 5 Aventureiros | Distrito Geek')).toBe('Kit 5 Aventureiros | Distrito Geek')
  })

  it('calcula tendência sem estourar para infinito quando o período anterior é zero', () => {
    expect(trend(10, 5)).toEqual({ current: 10, previous: 5, delta: 5, changeRatio: 1 })
    expect(trend(8, 0)).toEqual({ current: 8, previous: 0, delta: 8, changeRatio: null })
    expect(trend(0, 0).changeRatio).toBeNull()
  })

  it('soma relatórios de dois períodos separando atual de anterior', () => {
    const report = { rows: [
      { dimensionValues: [{ value: 'date_range_0' }], metricValues: [{ value: '40' }, { value: '50' }] },
      { dimensionValues: [{ value: 'date_range_1' }], metricValues: [{ value: '25' }, { value: '30' }] },
    ] }
    expect(sumDualRange(report, 0)).toEqual({ current: 40, previous: 25 })
    expect(sumDualRange(report, 1)).toEqual({ current: 50, previous: 30 })
    const events = { rows: [
      { dimensionValues: [{ value: 'guide_view' }, { value: 'date_range_0' }], metricValues: [{ value: '100' }] },
      { dimensionValues: [{ value: 'guide_view' }, { value: 'date_range_1' }], metricValues: [{ value: '60' }] },
      { dimensionValues: [{ value: 'guide_product_click' }, { value: 'date_range_0' }], metricValues: [{ value: '15' }] },
    ] }
    expect(sumDualRangeEvent(events, 'guide_view')).toEqual({ current: 100, previous: 60 })
    expect(sumDualRangeEvent(events, 'guide_product_click')).toEqual({ current: 15, previous: 0 })
  })

  it('detecta gaps de conteúdo: busca com impressões caindo na home', () => {
    const gaps = contentGapsFrom([
      { query: 'marcador iniciativa rpg', landingPage: '/', clicks: 0, impressions: 45, ctr: 0, position: 22 },
      { query: 'tokens rpg', landingPage: '/guias/tokens-rpg', clicks: 3, impressions: 120, ctr: 0.025, position: 6 },
      { query: 'busca fraca', landingPage: '', clicks: 0, impressions: 3, ctr: 0, position: 40 },
    ])
    expect(gaps.map((gap) => gap.query)).toEqual(['marcador iniciativa rpg'])
    expect(gaps[0].note).toMatch(/oportunidade de conte/i)
    expect(gaps[0].landingPage).toBe('/')
  })

  it('expõe totais anteriores do Search Console para as tendências', async () => {
    const empty = await settleSearchConsole(Promise.resolve({ rows: [] }))
    expect(empty.previousTotals).toEqual({ clicks: 0, impressions: 0 })
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
