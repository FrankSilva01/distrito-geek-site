import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { homeCategories, selectHomeFeatured } from './home-curation'

describe('home curation', () => {
  it('keeps utilities out and limits repeated product families', () => {
    const [base] = loadSeedCatalog()
    const products = [
      { ...base, id: 'goblin-a', title: 'Kit Exército Goblin RPG 12 Miniaturas', featured: true },
      { ...base, id: 'goblin-b', title: 'Kit Miniaturas Goblins RPG Kit 12', featured: true },
      { ...base, id: 'figure', title: 'Dragonite Pokémon Action Figure', category: 'action-figures', featured: true },
      { ...base, id: 'utility', title: 'Organizador de Paletas', category: 'utilidades-geek', featured: true },
      { ...base, id: 'skeleton', title: 'Miniatura Esqueleto Guerreiro RPG', featured: false },
    ]
    const result = selectHomeFeatured(products, 8)
    expect(result.map((product) => product.id)).not.toContain('utility')
    expect(result.filter((product) => /goblin/i.test(product.title))).toHaveLength(1)
    expect(result.map((product) => product.id)).toContain('figure')
  })

  it('builds only the three approved categories from representative real products', () => {
    const categories = homeCategories(loadSeedCatalog())
    expect(categories.map((category) => category.slug)).toEqual(['miniaturas-rpg', 'action-figures', 'kits-exercitos'])
    expect(categories.every((category) => category.image.length > 0)).toBe(true)
  })
})
