// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { edgeMetadataForRoute } from './edge-metadata'

const product = {
  id: 'mlb-1', slug: 'mago-rpg-32mm', title: 'Miniatura Mago RPG 32mm', description: 'Miniatura detalhada em resina para campanhas de RPG.',
  price: 49.9, currency: 'BRL', stock: 2, status: 'published', category: 'miniaturas-rpg', images: ['https://http2.mlstatic.com/mago.jpg'], attributes: { Escala: '32mm' },
  featured: false, showOnStorefront: true, listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
}

describe('edgeMetadataForRoute', () => {
  it('renders product snippet data from the synchronized listing', () => {
    const result = edgeMetadataForRoute('/produto/mago-rpg-32mm', '', [product])
    expect(result.status).toBe(200)
    expect(result.metadata.canonical).toBe('https://distritogeek.com.br/produto/mago-rpg-32mm')
    expect(result.metadata.structuredData).toEqual(expect.arrayContaining([expect.objectContaining({ '@type': 'Product', name: 'Miniatura Mago RPG 32mm' })]))
  })

  it('prevents personal utility pages from entering the index', () => {
    expect(edgeMetadataForRoute('/favoritos', '', [product]).metadata.robots).toBe('noindex, follow')
    expect(edgeMetadataForRoute('/comparar', '', [product]).metadata.robots).toBe('noindex, follow')
  })

  it('classifies an unknown public route as a real 404', () => {
    const result = edgeMetadataForRoute('/rota-que-nao-existe', '', [product])
    expect(result.status).toBe(404)
    expect(result.metadata.robots).toBe('noindex, follow')
  })
})
