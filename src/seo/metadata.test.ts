import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { SEO_LANDINGS, productsForLanding } from './landing-pages'
import { metadataForRoute } from './metadata'

const products = loadSeedCatalog()

describe('SEO policy', () => {
  it('defines every approved editorial landing', () => {
    expect(SEO_LANDINGS.map((item) => item.path)).toEqual(expect.arrayContaining([
      '/miniaturas-rpg', '/miniaturas-dnd', '/miniaturas-pathfinder', '/miniaturas-rpg-32mm',
      '/miniaturas-resina', '/kits-rpg', '/action-figures',
    ]))
  })

  it('selects only real public products for a landing', () => {
    const landing = SEO_LANDINGS.find((item) => item.path === '/miniaturas-rpg')!
    const selected = productsForLanding(landing, [products[0], { ...products[1], showOnStorefront: false }])
    expect(selected.every((product) => product.status === 'published' && product.showOnStorefront)).toBe(true)
  })

  it('uses product editorial metadata and a clean canonical', () => {
    const product = { ...products[0], seoTitle: 'Kit Goblins RPG 32mm em Resina', seoDescription: 'Conheça este kit de goblins para aventuras de RPG.' }
    const metadata = metadataForRoute(`/produto/${product.slug}`, '', [product])
    expect(metadata.title).toBe('Kit Goblins RPG 32mm em Resina | Distrito Geek')
    expect(metadata.description).toBe('Conheça este kit de goblins para aventuras de RPG.')
    expect(metadata.canonical).toBe(`https://distritogeek.com.br/produto/${product.slug}`)
    expect(metadata.breadcrumbs.at(-1)?.name).toBeTruthy()
  })

  it('marks catalog filter combinations noindex and canonicalizes the clean route', () => {
    const metadata = metadataForRoute('/categoria/todos', '?sort=price&maxPrice=100', products)
    expect(metadata.robots).toBe('noindex, follow')
    expect(metadata.canonical).toBe('https://distritogeek.com.br/categoria/todos')
  })
})
