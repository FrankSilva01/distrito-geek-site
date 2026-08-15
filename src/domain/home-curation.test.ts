import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { homeCategories, selectHomeFamilies, selectHomeFeatured, selectNewProducts } from './home-curation'
import type { ProductFamily } from './product-family'

describe('home curation', () => {
  it('keeps utilities out and limits repeated product families', () => {
    const [base] = loadSeedCatalog()
    const products = [
      { ...base, id: 'goblin-a', title: 'Kit Exército Goblin RPG 12 Miniaturas', familyId: 'family-goblins', featured: true },
      { ...base, id: 'goblin-b', title: 'Kit Miniaturas Goblins RPG Kit 12', familyId: 'family-goblins', featured: true },
      { ...base, id: 'figure', title: 'Dragonite Pokémon Action Figure', category: 'action-figures', featured: true },
      { ...base, id: 'utility', title: 'Organizador de Paletas', category: 'utilidades-geek', featured: true },
      { ...base, id: 'skeleton', title: 'Miniatura Esqueleto Guerreiro RPG', featured: false },
    ]
    const result = selectHomeFeatured(products, 8)
    expect(result.map((product) => product.id)).not.toContain('utility')
    expect(result.filter((product) => /goblin/i.test(product.title))).toHaveLength(1)
    expect(result.map((product) => product.id)).toContain('figure')
  })

  it('builds only categories that have representative real products', () => {
    const categories = homeCategories(loadSeedCatalog())
    expect(categories.length).toBeGreaterThan(0)
    expect(categories.every((category) => category.productCount > 0)).toBe(true)
    expect(categories.every((category) => category.image.length > 0)).toBe(true)
  })

  it('does not invent an empty category with an unrelated fallback image', () => {
    const [base] = loadSeedCatalog()
    const categories = homeCategories([{ ...base, category: 'miniaturas-rpg', title: 'Miniatura Necromante RPG' }])
    expect(categories.map((category) => category.slug)).toEqual(['miniaturas-rpg'])
  })

  it('publishes only explicitly curated families with at least two real products', () => {
    const [base] = loadSeedCatalog()
    const families: ProductFamily[] = [
      { id: 'goblins', name: 'Goblins', slug: 'goblins', shortDescription: 'Família real com produtos suficientes no catálogo.', productIds: ['a', 'b'], priority: 20, published: true },
      { id: 'orcs', name: 'Orcs', slug: 'orcs', shortDescription: 'Família sem produtos suficientes para virar vitrine.', productIds: ['c'], priority: 10, published: true },
    ]
    const result = selectHomeFamilies([{ ...base, id: 'a' }, { ...base, id: 'b' }, { ...base, id: 'c' }], families)
    expect(result.map(({ family }) => family.slug)).toEqual(['goblins'])
    expect(result[0].products).toHaveLength(2)
  })

  it('orders new products by creation rather than marketplace update', () => {
    const [base] = loadSeedCatalog()
    const result = selectNewProducts([
      { ...base, id: 'older', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-08-15T00:00:00.000Z' },
      { ...base, id: 'newer', createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z' },
    ])
    expect(result.map((product) => product.id)).toEqual(['newer', 'older'])
  })
})
