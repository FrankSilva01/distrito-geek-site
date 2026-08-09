import { describe, expect, it } from 'vitest'
import { loadStorefrontCatalog, mapStorefrontProduct } from './storefront'

const realListing = {
  marketplace: 'Mercado Livre', external_id: 'MLB4883770099',
  title: 'Kit 5 Miniaturas RPG 32mm', description: 'Miniaturas detalhadas para RPG e colecao.',
  category: 'Miniaturas RPG', price: 94.9, status: 'active',
  marketplace_url: 'https://produto.mercadolivre.com.br/MLB-4883770099-kit-5-miniaturas-_JM',
  image_url: 'https://http2.mlstatic.com/D_123-O.jpg',
  images: ['https://http2.mlstatic.com/D_123-O.jpg'], available_quantity: 3,
  featured: false, updated_at: '2026-08-04T10:14:42.205Z', raw_payload: {},
}

describe('FlowOps storefront mapping', () => {
  it('preserves the real Mercado Livre permalink, image, quantity and sync date', () => {
    const product = mapStorefrontProduct(realListing)
    expect(product.listings[0].url).toBe(realListing.marketplace_url)
    expect(product.images).toEqual(realListing.images)
    expect(product.stock).toBe(3)
    expect(product.updatedAt).toBe(realListing.updated_at)
  })

  it('uses storefront title and image overrides without changing marketplace data', () => {
    const product = mapStorefrontProduct({
      ...realListing,
      raw_payload: { storefront_title: 'Kit de Guerreiros RPG', storefront_image: 'https://cdn.example.com/guerreiros.jpg' },
    })
    expect(product.title).toBe('Kit de Guerreiros RPG')
    expect(product.images[0]).toBe('https://cdn.example.com/guerreiros.jpg')
    expect(product.attributes['Título no marketplace']).toBe(realListing.title)
    expect(product.price).toBe(94.9)
  })

  it('does not publish paused or closed listings', () => {
    expect(mapStorefrontProduct({ ...realListing, status: 'paused' }).status).toBe('paused')
    expect(mapStorefrontProduct({ ...realListing, status: 'closed' }).status).toBe('archived')
  })

  it('never substitutes a different product image', () => {
    const product = mapStorefrontProduct({ ...realListing, image_url: '', images: [] })
    expect(product.images).toEqual(['/assets/product-placeholder.webp'])
  })

  it('drops insecure marketplace image variants', () => {
    const product = mapStorefrontProduct({ ...realListing, images: ['https://http2.mlstatic.com/D_123-O.jpg', 'http://http2.mlstatic.com/D_123-I.jpg'] })
    expect(product.images).toEqual(['https://http2.mlstatic.com/D_123-O.jpg'])
  })

  it('translates marketplace domain categories into storefront categories', () => {
    expect(mapStorefrontProduct({ ...realListing, category: 'MLB_MINIATURES' }).category).toBe('miniaturas-rpg')
    expect(mapStorefrontProduct({ ...realListing, category: 'MLB_ACTION_FIGURES' }).category).toBe('action-figures')
  })

  it('loads only valid real records from the existing storefront endpoint', async () => {
    const fetcher = async () => new Response(JSON.stringify({ ok: true, products: [realListing] }))
    const products = await loadStorefrontCatalog('https://example.com/storefront', fetcher)
    expect(products.map((item) => item.id)).toEqual(['MLB4883770099'])
  })

  it('fails explicitly instead of returning mock products', async () => {
    const fetcher = async () => new Response(JSON.stringify({ ok: false }), { status: 503 })
    await expect(loadStorefrontCatalog('https://example.com/storefront', fetcher)).rejects.toThrow('Catálogo sincronizado indisponível')
  })
})
