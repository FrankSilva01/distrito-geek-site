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
  it('curates the six real RPG scenery products as one bidirectional family', () => {
    const scenery = CURATED_PRODUCT_FAMILIES.find((candidate) => candidate.id === 'family-cenarios-rpg')

    expect(scenery).toMatchObject({
      name: 'Cenários RPG',
      slug: 'cenarios-rpg',
      productIds: ['MLB7451208354', 'MLB7451226704', 'MLB5071806599', 'MLB7462237046', 'MLB7426771372', 'MLB7427034982'],
      published: true,
    })

    // Árvores entrou na família: o Admin reportava a peça como fora de curadoria.
    expect(familyForProduct('MLB5071806599', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')
    expect(familyForProduct('MLB7451226704', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')
    expect(familyForProduct('MLB7451208354', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')
    expect(familyForProduct('MLB7462237046', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')

    const temple = product('MLB7426771372')
    const ruins = product('MLB7427034982')
    expect(relatedProductsFor(temple, [temple, ruins], CURATED_PRODUCT_FAMILIES)).toEqual([
      { product: ruins, relation: { productId: ruins.id, type: 'mesma-familia', priority: 104 } },
    ])
    expect(relatedProductsFor(ruins, [temple, ruins], CURATED_PRODUCT_FAMILIES)).toEqual([
      { product: temple, relation: { productId: temple.id, type: 'mesma-familia', priority: 104 } },
    ])
  })

  it('orders scenery cross-sell so rocks lead crystals and trees, and rocks lead with crystals', () => {
    const rocks = product('MLB7451208354')
    const crystals = product('MLB7451226704')
    const trees = product('MLB5071806599')
    const portal = product('MLB7462237046')
    const temple = product('MLB7426771372')
    const catalog = [rocks, crystals, trees, portal, temple]

    const first = (item: Product) => relatedProductsFor(item, catalog, CURATED_PRODUCT_FAMILIES).map((entry) => entry.product.id)
    expect(first(crystals)[0]).toBe(rocks.id)
    expect(first(rocks).slice(0, 2)).toEqual([crystals.id, trees.id])
    expect(first(trees)[0]).toBe(rocks.id)
    // O portal não desloca as prioridades dos três kits: entra depois deles.
    expect(first(crystals).slice(0, 3)).toEqual([rocks.id, trees.id, portal.id])
  })

  it('keeps the live orc kit inside the curated orcs family', () => {
    expect(familyForProduct('MLB7400799166', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-orcs')
  })

  // Os SKUs DG são a identidade estável do catálogo; o mapeamento para o id interno usado na
  // curadoria está aqui para o teste falhar se algum produto trocar de família por engano.
  it('anchors every recently synced product to the family its DG SKU belongs to', () => {
    const esperado: Array<[string, string, string]> = [
      ['DG-MIN-000048', 'MLB7451208354', 'family-cenarios-rpg'], // Kit 10 Rochas
      ['DG-MIN-000049', 'MLB7451226704', 'family-cenarios-rpg'], // Kit 10 Cristais Mágicos
      ['DG-MIN-000050', 'MLB7462237046', 'family-cenarios-rpg'], // Portal em Ruínas
      ['DG-MIN-000051', 'MLB5096680875', 'family-goblins'], //     Kit 5 Goblins Aventureiros
      ['DG-MIN-000047', 'MLB5071806599', 'family-cenarios-rpg'], // Kit 10 Árvores
      ['DG-MIN-000044', 'MLB7400799166', 'family-orcs'], //         Kit 4 Orcs
    ]
    for (const [sku, id, familyId] of esperado) {
      expect(familyForProduct(id, CURATED_PRODUCT_FAMILIES)?.id, sku).toBe(familyId)
    }
  })

  it('curates by stable identifier only, never by title, and adds no stray family', () => {
    // Se alguém trocar a curadoria por casamento de título, este teste cai.
    for (const family of CURATED_PRODUCT_FAMILIES) {
      for (const productId of family.productIds) {
        expect(productId, `${family.id} → ${productId}`).toMatch(/^MLB\d+$/)
      }
    }
    // Nenhuma família nova: "Goblins Aventureiros" e afins não devem existir.
    expect(CURATED_PRODUCT_FAMILIES.map((family) => family.id).sort()).toEqual([
      'family-aventureiros', 'family-cenarios-rpg', 'family-goblins', 'family-mortos-vivos',
      'family-necromantes', 'family-orcs', 'family-vampiros',
    ])
  })

  it('never surfaces a hidden product as a family relation', () => {
    const rocks = product('MLB7451208354')
    const crystals = product('MLB7451226704')
    const hiddenPortal = product('MLB7462237046')
    hiddenPortal.showOnStorefront = false
    const pausedTemple = product('MLB7426771372', 'paused')

    const ids = relatedProductsFor(rocks, [rocks, crystals, hiddenPortal, pausedTemple], CURATED_PRODUCT_FAMILIES)
      .map((entry) => entry.product.id)
    expect(ids).toEqual([crystals.id])
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
