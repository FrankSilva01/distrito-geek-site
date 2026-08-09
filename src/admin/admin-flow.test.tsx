import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminPage } from './AdminPage'

afterEach(() => vi.restoreAllMocks())

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
  expect(screen.getByLabelText('Mostrar na vitrine')).toBeChecked()
  await user.click(screen.getByLabelText('Produto em destaque'))
  await user.click(screen.getByRole('button', { name: 'Salvar curadoria' }))
  expect(await screen.findByText('Curadoria salva.')).toBeVisible()
})

it('keeps acquisition reports in a dedicated Analytics navigation section', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('admin-session')) return new Response(JSON.stringify({ authenticated: true }))
    if (url.includes('admin-analytics')) return new Response(JSON.stringify({
      configured: true,
      generatedAt: '2026-08-09T12:00:00.000Z',
      totals: { users: 2, sessions: 3, pageViews: 5, productViews: 1, mercadoLivreClicks: 1, shopeeClicks: 0, ctr: 1 },
      channels: [], products: [], searchConsole: { totals: { clicks: 0, impressions: 0 }, rows: [], opportunities: [] },
    }))
    return new Response(JSON.stringify({ products: [] }))
  })

  render(<AdminPage />)
  const user = userEvent.setup()
  expect(await screen.findByRole('heading', { name: /visão geral/i })).toBeVisible()
  expect(screen.queryByRole('heading', { name: /aquisição e seo/i })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /análises/i }))
  expect(await screen.findByRole('heading', { name: /aquisição e seo/i })).toBeVisible()
  expect(screen.getByText('2')).toBeVisible()
})
