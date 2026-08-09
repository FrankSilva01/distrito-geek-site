import { describe, expect, it } from 'vitest'
import { canPublishProduct, isAllowedMarketplaceUrl, productSchema, type Product } from './product'

const makeProduct = (changes: Partial<Product> = {}): Product => ({
  id: 'mago-rpg', slug: 'miniatura-mago-rpg', title: 'Miniatura Mago RPG 32mm Resina',
  description: 'Miniatura artesanal detalhada para mesas de RPG e coleção.',
  price: 99.9, currency: 'BRL', stock: 4, status: 'published', category: 'miniaturas-rpg',
  images: ['https://http2.mlstatic.com/product.jpg'], attributes: { Material: 'Resina' },
  featured: true, showOnStorefront: true, version: 1, createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z',
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB4883770099', url: 'https://produto.mercadolivre.com.br/MLB-4883770099', active: true }],
  ...changes,
})

describe('product publication rules', () => {
  it('rejects publication without an image', () => {
    expect(canPublishProduct(makeProduct({ images: [] }))).toBe(false)
  })

  it('rejects an unsafe marketplace URL', () => {
    expect(isAllowedMarketplaceUrl('javascript:alert(1)')).toBe(false)
    expect(canPublishProduct(makeProduct({ listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'javascript:alert(1)', active: true }] }))).toBe(false)
  })

  it('accepts a complete product with an allowed HTTPS listing', () => {
    expect(canPublishProduct(makeProduct())).toBe(true)
  })

  it('keeps existing published products visible when editorial visibility is absent', () => {
    const parsed = productSchema.parse(makeProduct())
    expect(parsed.showOnStorefront).toBe(true)
  })

  it('accepts optional storefront and SEO editorial fields', () => {
    const parsed = productSchema.parse(makeProduct({
      storefrontDescription: 'Uma descrição editorial exclusiva para a vitrine.',
      seoTitle: 'Miniatura Mago RPG 32mm em Resina',
      seoDescription: 'Conheça a miniatura de mago em resina para aventuras de RPG.',
      seoTags: ['mago', 'rpg', '32mm'],
    }))
    expect(parsed).toMatchObject({
      storefrontDescription: 'Uma descrição editorial exclusiva para a vitrine.',
      seoTitle: 'Miniatura Mago RPG 32mm em Resina',
      seoTags: ['mago', 'rpg', '32mm'],
    })
  })
})
