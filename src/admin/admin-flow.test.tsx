import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminPage } from './AdminPage'

afterEach(() => vi.restoreAllMocks())

it('exibe buscas internas em uma seção própria e recalcula o estado atual', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    if (url.includes('admin-searches')) return new Response(JSON.stringify({ configured: true, generatedAt: '2026-08-15T19:00:00.000Z', searchSignals: [{ normalizedTerm: 'beholder', variants: ['beholder'], searches: 2, users: 1, sessions: 1, lastOccurredAt: '2026-08-15T18:45:00.000Z' }] }))
    if (url.includes('admin-opportunities')) return new Response(JSON.stringify({ opportunities: [] }))
    return new Response(JSON.stringify({ products: [] }))
  })
  render(<AdminPage />)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /buscas sem resultado/i }))
  expect(await screen.findByText('SEM PRODUTO')).toBeVisible()
  expect(screen.getByText('beholder')).toBeVisible()
  expect(screen.getByText(/nenhum produto atual/i)).toBeVisible()
})

it('restores an authenticated admin session after a page reload', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    return new Response(JSON.stringify([]))
  })
  render(<AdminPage />)
  expect(await screen.findByRole('heading', { name: /visão geral/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /cadastrar anúncio manualmente/i })).toBeVisible()
})

it('lets an admin save storefront visibility and featured preferences', async () => {
  const product = {
    id: 'MLB1', slug: 'kit-rpg-mlb1', title: 'Kit de Miniaturas RPG', marketplaceTitle: 'Kit de Miniaturas Rpg',
    description: 'Kit completo de miniaturas para campanhas de RPG.', price: 94.9, currency: 'BRL', stock: 3,
    status: 'published', category: 'miniaturas-rpg', images: ['https://http2.mlstatic.com/product.jpg'],
    attributes: { Marketplace: 'Mercado Livre' }, featured: false, showOnStorefront: true,
    listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
    version: 1, createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z',
  }
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    if (url.includes('admin-products') && init?.method === 'PATCH') return new Response(JSON.stringify({ override: { id: 'MLB1' } }))
    return new Response(JSON.stringify({ products: [product] }))
  })

  render(<AdminPage />)
  const user = userEvent.setup()
  expect(await screen.findByRole('heading', { name: 'Curadoria da vitrine' })).toBeVisible()
  // A edição agora acontece num drawer: abrir pelo botão Editar da linha do produto.
  await user.click(await screen.findByRole('button', { name: /editar/i }))
  await user.click(screen.getByRole('button', { name: 'Visibilidade' }))
  // Três controles independentes: publicado / mostrar na home / destaque na home.
  expect(screen.getByLabelText(/publicado/i)).toBeChecked()
  expect(screen.getByLabelText(/mostrar na home/i)).toBeInTheDocument()
  await user.click(screen.getByLabelText(/destaque na home/i))
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByText(/produto salvo/i)).toBeVisible()
})

it('keeps acquisition reports in a dedicated Analytics navigation section', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    if (url.includes('admin-analytics')) return new Response(JSON.stringify({
      configured: true,
      generatedAt: '2026-08-09T12:00:00.000Z',
      totals: { users: 2, sessions: 3, pageViews: 5, productViews: 1, mercadoLivreClicks: 1, shopeeClicks: 0, ctr: 1 },
      channels: [], products: [], searchConsole: { totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, rows: [], topQueries: [], topPages: [], opportunities: [] },
      health: [
        { provider: 'GA4', status: 'active', detail: 'Relatórios disponíveis' },
        { provider: 'Search Console', status: 'waiting', detail: 'Aguardando dados' },
        { provider: 'Google Tag Manager', status: 'active', detail: 'Eventos recebidos' },
        { provider: 'Microsoft Clarity', status: 'active', detail: 'Comportamento disponível' },
      ],
      recentEvents: [{ name: 'view_product', count: 3, minutesAgo: 2, lastSeenAt: '2026-08-09T11:58:00.000Z' }],
      clarity: { available: true, periodDays: 3, sessions: 4, users: 3, pagesPerSession: 1.5, scrollDepth: 64, engagementTimeSeconds: 83, deadClicks: 2, rageClicks: 1, quickbacks: 0, scriptErrors: 0 },
    }))
    return new Response(JSON.stringify({ products: [] }))
  })

  render(<AdminPage />)
  const user = userEvent.setup()
  expect(await screen.findByRole('heading', { name: /visão geral/i })).toBeVisible()
  expect(screen.queryByRole('heading', { name: /aquisição e seo/i })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /análises/i }))
  expect(await screen.findByRole('heading', { name: /aquisição e seo/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /saúde das integrações/i })).toBeVisible()
  expect(screen.getByText('Microsoft Clarity')).toBeVisible()
  expect(screen.getByRole('heading', { name: /eventos recentes/i })).toBeVisible()
  expect(screen.getByText('view_product')).toBeVisible()
  expect(screen.getByRole('heading', { name: /funil comercial/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /interesse e clique para compra/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /desempenho e cobertura por canal/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /cobertura comercial e prontidão/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /comportamento no clarity/i })).toBeVisible()
})

it('renderiza desempenho de guias, termos e faixas de oportunidade quando há dados de Search Console', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    if (url.includes('admin-analytics')) return new Response(JSON.stringify({
      configured: true, generatedAt: '2026-08-11T12:00:00.000Z',
      totals: { users: 10, sessions: 12, pageViews: 30, productViews: 4, mercadoLivreClicks: 2, shopeeClicks: 1, ctr: 0.75 },
      channels: [], products: [], recentEvents: [],
      searchConsole: {
        available: true, status: 'ok', totals: { clicks: 8, impressions: 400, ctr: 0.02, position: 9.1 },
        rows: [], topQueries: [], topPages: [], opportunities: [],
        guidePerformance: [{ page: '/guias/tokens-rpg', clicks: 3, impressions: 120, ctr: 0.025, position: 6.4 }],
        searchTerms: [{ query: 'tokens rpg', landingPage: '/guias/tokens-rpg', clicks: 3, impressions: 120, ctr: 0.025, position: 6.4 }],
        seoBands: [{ id: 'top-3', label: 'Posição 4–10 · oportunidade Top 3', hint: 'Dá para subir.', queries: [{ query: 'tokens rpg', landingPage: '/guias/tokens-rpg', clicks: 3, impressions: 120, ctr: 0.025, position: 6.4 }] }],
        lowCtr: [{ query: 'miniaturas rpg', landingPage: '/miniaturas-rpg', clicks: 1, impressions: 200, ctr: 0.005, position: 4.2, suggestion: 'Revise title e description.' }],
      },
    }))
    return new Response(JSON.stringify({ products: [] }))
  })

  render(<AdminPage />)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /análises/i }))
  expect(await screen.findByRole('heading', { name: /desempenho dos guias no google/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /termos de pesquisa/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /oportunidades de seo/i })).toBeVisible()
  expect(screen.getByText(/oportunidade top 3/i)).toBeVisible()
  expect(screen.getByRole('heading', { name: /ctr abaixo do esperado/i })).toBeVisible()
})

it('renderiza funil editorial, visão por cluster, tendências e landings orgânicas', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    if (url.includes('admin-analytics')) return new Response(JSON.stringify({
      configured: true, generatedAt: '2026-08-11T12:00:00.000Z',
      totals: { users: 10, sessions: 12, pageViews: 30, productViews: 4, mercadoLivreClicks: 2, shopeeClicks: 1, ctr: 0.75 },
      channels: [], products: [], recentEvents: [],
      searchConsole: { available: true, status: 'ok', totals: { clicks: 8, impressions: 400, ctr: 0.02, position: 9.1 }, previousTotals: { clicks: 4, impressions: 200 }, rows: [], topQueries: [], topPages: [], opportunities: [], guidePerformance: [], searchTerms: [], seoBands: [], lowCtr: [] },
      guideFunnel: [{ slug: 'tokens-rpg', title: 'Tokens de RPG', cluster: 'acessorios', views: 100, productClicks: 20, categoryClicks: 8, relatedClicks: 5, productCtr: 0.2 }],
      clusterView: [{ cluster: 'acessorios', label: 'Acessórios', guideViews: 100, organicEntrances: 12, impressions: 300, clicks: 6, productClicks: 20 }],
      organicLandings: [{ path: '/guias/tokens-rpg', kind: 'guide', users: 9, sessions: 11, clicks: 3, impressions: 120, ctr: 0.025, position: 6.4 }],
      trends: { organicClicks: { current: 8, previous: 4, delta: 4, changeRatio: 1 }, impressions: { current: 400, previous: 200, delta: 200, changeRatio: 1 }, organicUsers: { current: 5, previous: 0, delta: 5, changeRatio: null }, organicSessions: { current: 6, previous: 3, delta: 3, changeRatio: 1 }, guideViews: { current: 100, previous: 60, delta: 40, changeRatio: 0.67 }, productClicks: { current: 20, previous: 0, delta: 20, changeRatio: null } },
    }))
    return new Response(JSON.stringify({ products: [] }))
  })

  render(<AdminPage />)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /análises/i }))
  expect(await screen.findByRole('heading', { name: /funil editorial dos guias/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /visão por cluster/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /^tendências$/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: /landing pages orgânicas/i })).toBeVisible()
  expect(screen.getByRole('link', { name: /tokens de rpg/i })).toBeVisible()
  // previous=0 vira "novo", nunca infinito.
  expect(screen.getAllByText(/novo/i).length).toBeGreaterThan(0)
})
