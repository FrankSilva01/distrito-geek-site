import { describe, expect, it } from 'vitest'
import { CURATED_PRODUCT_FAMILIES, familyForProduct, productFamilySchema, relatedProductsFor, type ProductFamily } from './product-family'
import type { Product } from './product'

const product = (id: string, status: Product['status'] = 'published'): Product => ({
  id, slug: id.toLowerCase(), title: `Produto ${id} completo`, description: 'Descrição suficiente para publicação do produto.',
  price: 89.9, currency: 'BRL', stock: 2, status, category: 'miniaturas-rpg', images: ['/produto.webp'],
  attributes: {}, featured: false, showOnStorefront: true, listings: [{ marketplace: 'mercado-livre', externalId: id, url: `https://produto.mercadolivre.com.br/${id}`, active: true }],
  version: 1, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
})

const family: ProductFamily = {
  id: 'familia-orcs', name: 'Orcs', slug: 'orcs', shortDescription: 'Miniaturas de Orcs para encontros de RPG.',
  productIds: ['ORC-1', 'ORC-2'], priority: 10, published: true,
}

describe('product families and commercial relations', () => {
  it('curates the two real RPG scenery products as one bidirectional family', () => {
    const scenery = CURATED_PRODUCT_FAMILIES.find((candidate) => candidate.id === 'family-cenarios-rpg')

    expect(scenery).toMatchObject({
      name: 'Cenários RPG',
      slug: 'cenarios-rpg',
      productIds: ['MLB7426771372', 'MLB7427034982'],
      published: true,
    })

    const temple = product('MLB7426771372')
    const ruins = product('MLB7427034982')
    expect(relatedProductsFor(temple, [temple, ruins], CURATED_PRODUCT_FAMILIES)).toEqual([
      { product: ruins, relation: { productId: ruins.id, type: 'mesma-familia', priority: 100 } },
    ])
    expect(relatedProductsFor(ruins, [temple, ruins], CURATED_PRODUCT_FAMILIES)).toEqual([
      { product: temple, relation: { productId: temple.id, type: 'mesma-familia', priority: 100 } },
    ])
  })

  it('validates an explicitly curated family without keyword inference', () => {
    expect(productFamilySchema.parse(family)).toEqual(family)
    expect(familyForProduct('ORC-2', [family])?.slug).toBe('orcs')
    expect(familyForProduct('ORC-3', [family])).toBeUndefined()
  })

  it('shows only public valid related products in editorial order', () => {
    const current = product('ORC-1')
    current.relatedProducts = [
      { productId: 'ORC-3', type: 'alternativa', priority: 30 },
      { productId: 'ORC-2', type: 'complete-o-encontro', priority: 10 },
      { productId: 'ORC-HIDDEN', type: 'combina-com', priority: 20 },
    ]
    const result = relatedProductsFor(current, [current, product('ORC-2'), product('ORC-3'), product('ORC-HIDDEN', 'paused')])
    expect(result.map((item) => item.product.id)).toEqual(['ORC-2', 'ORC-3'])
    expect(result[0].relation.type).toBe('complete-o-encontro')
  })

  it('rejects duplicate/self relations through normalization', () => {
    const current = product('ORC-1')
    current.relatedProducts = [
      { productId: 'ORC-1', type: 'combina-com', priority: 1 },
      { productId: 'ORC-2', type: 'combina-com', priority: 2 },
      { productId: 'ORC-2', type: 'alternativa', priority: 3 },
    ]
    expect(relatedProductsFor(current, [current, product('ORC-2')])).toHaveLength(1)
  })
})
