import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CatalogProvider, useCatalog } from './catalog-provider'
import { loadSeedCatalog } from './seed-loader'

afterEach(() => vi.restoreAllMocks())

it('replaces the bundled fallback with the live catalog', async () => {
  const live = { ...loadSeedCatalog()[0], id: 'live-1', title: 'Produto atualizado no painel' }
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ products: [live] }), { status: 200 }))
  function Consumer() { return <p>{useCatalog().map((product) => product.title).join(',')}</p> }

  render(<CatalogProvider><Consumer /></CatalogProvider>)

  expect(await screen.findByText('Produto atualizado no painel')).toBeVisible()
})
