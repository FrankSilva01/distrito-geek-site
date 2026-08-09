import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { filterAndSortProducts, priceRanges } from './catalog-filters'

describe('catalog filters', () => {
  const [base] = loadSeedCatalog()

  it('derives only useful price ranges from public product prices', () => {
    const products = [
      { ...base, id: 'low', price: 21.9 },
      { ...base, id: 'middle', price: 94.9 },
      { ...base, id: 'high', price: 750 },
    ]
    expect(priceRanges(products).map((range) => range.label)).toEqual(['Até R$ 50', 'R$ 50–100', 'Acima de R$ 400'])
  })

  it('searches the original marketplace title and sorts without mutating input', () => {
    const products = [
      { ...base, id: 'expensive', price: 200, marketplaceTitle: 'Dragão ancestral' },
      { ...base, id: 'cheap', price: 50, marketplaceTitle: 'Goblin arqueiro' },
    ]
    const original = products.map((product) => product.id)
    expect(filterAndSortProducts(products, { query: 'goblin', category: 'todos', priceRange: 'all', sort: 'menor-preco' }).map((product) => product.id)).toEqual(['cheap'])
    expect(products.map((product) => product.id)).toEqual(original)
  })

  it('filters editorially hidden products', () => {
    expect(filterAndSortProducts([{ ...base, showOnStorefront: false }], { query: '', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })

  it('ignores accents and understands common catalog synonyms', () => {
    const products = [
      { ...base, id: 'mage', storefrontTitle: 'Miniatura Mago Élfico 32mm', marketplaceTitle: 'Personagem arcano para D&D' },
    ]
    expect(filterAndSortProducts(products, { query: 'elfo', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['mage'])
    expect(filterAndSortProducts(products, { query: 'rpg', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['mage'])
  })

  it('tolerates a small typo without matching unrelated terms', () => {
    const products = [
      { ...base, id: 'dragon', storefrontTitle: 'Dragão ancestral em resina' },
      { ...base, id: 'goblin', storefrontTitle: 'Goblin arqueiro' },
    ]
    expect(filterAndSortProducts(products, { query: 'drgao', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['dragon'])
    expect(filterAndSortProducts(products, { query: 'carro', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })
})
