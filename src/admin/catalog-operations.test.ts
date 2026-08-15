import { describe, expect, it } from 'vitest'
import { catalogActionQueue, catalogExecutiveSummary, channelPriceRows } from './catalog-operations'
import type { Product } from '../domain/product'
import type { ProductFamily } from '../domain/product-family'

const product = (id: string, changes: Partial<Product> = {}): Product => ({
  id, slug: id.toLowerCase(), title: `Produto ${id} completo`, description: 'Descrição completa e válida para o catálogo público.', price: 90, currency: 'BRL', stock: 2,
  status: 'published', category: 'miniaturas-rpg', images: ['/produto.webp'], attributes: {}, featured: false, showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: id, url: `https://produto.mercadolivre.com.br/${id}`, active: true }],
  version: 1, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z', ...changes,
})
const families: ProductFamily[] = [{ id: 'fam-1', name: 'Orcs', slug: 'orcs', shortDescription: 'Miniaturas de orcs para encontros completos de RPG.', productIds: ['P1'], priority: 1, published: true }]

describe('catalog operations', () => {
  it('summarizes operational gaps without a synthetic score', () => {
    const result = catalogExecutiveSummary([
      product('P1', { storefrontDescription: 'Descrição própria.' }),
      product('P2', { showOnStorefront: false, images: [], listings: [] }),
    ], families, new Set(['P1']))
    expect(result).toMatchObject({ total: 2, public: 1, hidden: 1, withoutFamily: 1, withoutImage: 1, withoutChannel: 1, withoutGuide: 1 })
    expect(result).not.toHaveProperty('score')
  })

  it('creates deterministic action items with relevant filters', () => {
    const actions = catalogActionQueue([product('P1'), product('P2', { listings: [], familyId: undefined })], families, new Set(['P1']))
    expect(actions.some((item) => item.kind === 'without-family' && item.filter === 'sem-familia')).toBe(true)
    expect(actions.some((item) => item.kind === 'without-channel' && item.filter === 'sem-canal')).toBe(true)
  })

  it('reports different channel prices as information, never auto-corrects', () => {
    const rows = channelPriceRows(product('P1', {
      listings: [
        { marketplace: 'mercado-livre', externalId: 'ML1', url: 'https://produto.mercadolivre.com.br/ML1', active: true, price: 94.9 },
        { marketplace: 'tiktok', externalId: 'TT1', url: 'https://shop.tiktok.com/view/product/1', active: true, price: 89.9 },
      ],
    }))
    expect(rows.map((row) => row.price)).toEqual([94.9, 89.9])
    expect(rows.every((row) => row.different)).toBe(true)
  })
})
