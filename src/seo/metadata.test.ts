import { describe, expect, it } from 'vitest'
import { GUIDE_INDEX } from '../content/guides-index'
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

  it('aponta cada landing para guias que existem, sem repetir e sem apontar para si', () => {
    const slugs = new Set(GUIDE_INDEX.map((guide) => guide.slug))
    for (const landing of SEO_LANDINGS) {
      expect(landing.guideSlugs.length, `${landing.path} sem guia`).toBeGreaterThanOrEqual(2)
      expect(landing.guideSlugs.length, `${landing.path} com guias demais`).toBeLessThanOrEqual(5)
      expect(new Set(landing.guideSlugs).size, `${landing.path} repete guia`).toBe(landing.guideSlugs.length)
      for (const slug of landing.guideSlugs) expect(slugs, `${landing.path} -> ${slug}`).toContain(slug)
    }
  })

  it('uses product editorial metadata and a clean canonical', () => {
    const product = { ...products[0], seoTitle: 'Kit Goblins RPG 32mm em Resina', seoDescription: 'Conheça este kit de goblins para aventuras de RPG.' }
    const metadata = metadataForRoute(`/produto/${product.slug}`, '', [product])
    expect(metadata.title).toBe('Kit Goblins RPG 32mm em Resina | Distrito Geek')
    expect(metadata.description).toBe('Conheça este kit de goblins para aventuras de RPG.')
    expect(metadata.canonical).toBe(`https://distritogeek.com.br/produto/${product.slug}`)
    expect(metadata.breadcrumbs.at(-1)?.name).toBeTruthy()
  })

  it('describes the product offer with real identifiers and no invented rating', () => {
    const product = products.find((item) => item.listings.some((listing) => listing.active))!
    const schema = metadataForRoute(`/produto/${product.slug}`, '', [product]).structuredData
      .find((entry) => entry['@type'] === 'Product')!
    expect(schema.sku).toBe(product.sku || product.id)
    expect(schema.url).toBe(`https://distritogeek.com.br/produto/${product.slug}`)
    expect(schema.offers).toEqual(expect.objectContaining({
      priceCurrency: 'BRL',
      price: product.price,
      availability: 'https://schema.org/InStock',
      url: product.listings.find((listing) => listing.active)!.url,
    }))
    expect(schema.aggregateRating).toBeUndefined()
    expect(schema.review).toBeUndefined()
  })

  it('marks an offer out of stock instead of hiding it', () => {
    const product = { ...products.find((item) => item.listings.some((listing) => listing.active))!, stock: 0 }
    const schema = metadataForRoute(`/produto/${product.slug}`, '', [product]).structuredData
      .find((entry) => entry['@type'] === 'Product') as { offers: Record<string, unknown> } | undefined
    expect(schema?.offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('marks catalog filter combinations noindex and canonicalizes the clean route', () => {
    const metadata = metadataForRoute('/categoria/todos', '?sort=price&maxPrice=100', products)
    expect(metadata.robots).toBe('noindex, follow')
    expect(metadata.canonical).toBe('https://distritogeek.com.br/categoria/todos')
  })

  it('publishes article metadata for an editorial guide', () => {
    const metadata = metadataForRoute('/guias/escala-miniaturas-rpg-28mm-32mm-75mm', '', products)
    expect(metadata.type).toBe('article')
    expect(metadata.structuredData).toEqual(expect.arrayContaining([expect.objectContaining({ '@type': 'Article' })]))
  })
})
