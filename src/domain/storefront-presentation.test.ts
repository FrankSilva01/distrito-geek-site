import { describe, expect, it } from 'vitest'
import type { Product } from './product'
import { availabilityLabel, displayTitle, isPublicProduct } from './storefront-presentation'

const product: Product = {
  id: 'kit-rpg', slug: 'kit-rpg', title: 'Kit 5 Miniaturas Rpg 32mm Resina 8k D&d Pathfinder',
  marketplaceTitle: 'Kit 5 Miniaturas Rpg 32mm Resina 8k D&d Pathfinder',
  description: 'Conjunto detalhado para campanhas de RPG e colecionadores.',
  price: 94.9, currency: 'BRL', stock: 10, status: 'published', category: 'miniaturas-rpg',
  images: ['https://http2.mlstatic.com/product.jpg'], attributes: {}, featured: false,
  showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z',
}

describe('storefront product presentation', () => {
  it('uses an editorial title when one is configured', () => {
    expect(displayTitle({ ...product, storefrontTitle: 'Kit de aventureiros em resina' }))
      .toBe('Kit de aventureiros em resina')
  })

  it('normalizes known marketplace capitalization without changing its meaning', () => {
    expect(displayTitle(product)).toBe('Kit 5 Miniaturas RPG 32mm Resina 8K D&D Pathfinder')
  })

  it('reports made to order only when synchronized copy supports it', () => {
    expect(availabilityLabel({ ...product, stock: 0, description: 'Produto produzido sob demanda após a compra.' }))
      .toBe('Produção sob demanda')
    expect(availabilityLabel({ ...product, stock: 0, description: 'Peça para coleção.' }))
      .toBe('Indisponível')
  })

  it('excludes editorially hidden products from the public catalog', () => {
    expect(isPublicProduct(product)).toBe(true)
    expect(isPublicProduct({ ...product, showOnStorefront: false })).toBe(false)
  })
})
