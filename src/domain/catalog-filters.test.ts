import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { filterAndSortProducts, normalizeCatalogIntent, priceRanges, zeroResultOptions } from './catalog-filters'

describe('catalog filters', () => {
  const [base] = loadSeedCatalog()

  it('normaliza intenções equivalentes sem NLP ou matching agressivo', () => {
    expect(normalizeCatalogIntent('  Órcs ')).toBe('orc')
    expect(normalizeCatalogIntent('32 mm')).toBe('32mm')
    expect(normalizeCatalogIntent('miniaturas')).toBe('miniatura')
    expect(normalizeCatalogIntent('moedas')).toBe('moeda')
    expect(normalizeCatalogIntent('TÓKENS')).toBe('token')
  })

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

  it('finds the real RPG scenery products with accent and singular/plural variations', () => {
    const products = [
      { ...base, id: 'MLB7426771372', storefrontTitle: 'Templo em Ruínas RPG Cenário 3D Dungeon Fantasia', updatedAt: '2026-08-16T02:31:45.599Z' },
      { ...base, id: 'MLB7427034982', storefrontTitle: 'Kit 6 Ruínas RPG Cenário Modular Dungeon Fantasia 3D', updatedAt: '2026-08-16T02:31:44.850Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    for (const query of ['cenario', 'cenário', 'cenarios', 'cenários', 'ruina', 'ruína', 'ruinas', 'ruínas', 'dungeon']) {
      expect(search(query), query).toEqual(['MLB7426771372', 'MLB7427034982'])
    }
    expect(search('templo')).toEqual(['MLB7426771372'])
  })

  it('busca por atributo do produto, ignorando o marketplace', () => {
    const products = [
      { ...base, id: 'resin', storefrontTitle: 'Miniatura sem material no título', attributes: { Material: 'Resina', Marketplace: 'Mercado Livre' } },
    ]
    expect(filterAndSortProducts(products, { query: 'resina', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['resin'])
    // "mercado" não pode casar toda peça só porque o atributo Marketplace existe.
    expect(filterAndSortProducts(products, { query: 'mercado', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })

  it('tolerates a small typo without matching unrelated terms', () => {
    const products = [
      { ...base, id: 'dragon', storefrontTitle: 'Dragão ancestral em resina' },
      { ...base, id: 'goblin', storefrontTitle: 'Goblin arqueiro' },
    ]
    expect(filterAndSortProducts(products, { query: 'drgao', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['dragon'])
    expect(filterAndSortProducts(products, { query: 'carro', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })

  it('oferece saídas determinísticas quando a busca não encontra produto', () => {
    const products = [
      { ...base, id: 'goblin', category: 'miniaturas-rpg', featured: true },
      { ...base, id: 'figure', category: 'action-figures', featured: false },
      { ...base, id: 'hidden', category: 'utilidades', showOnStorefront: false },
    ]
    const result = zeroResultOptions(products, 'carro', 'todos')
    expect(result.categories).toEqual(['action-figures', 'miniaturas-rpg'])
    expect(result.products.map((item) => item.id)).toEqual(['goblin', 'figure'])
    expect(result.products.some((item) => item.id === 'hidden')).toBe(false)
  })
})
