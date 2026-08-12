import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { filterAndSortProducts } from './catalog-filters'
import { homeCategories, selectHomeFeatured } from './home-curation'
import { isPublicProduct, showsOnHome } from './storefront-presentation'
import { GUIDES, productsForGuide } from '../content/guides'
import { metadataForRoute } from '../seo/metadata'
import { sitemapPaths } from '../../netlify/functions/sitemap'

/**
 * Três conceitos de visibilidade, testados em todas as superfícies:
 * PUBLICADO (isPublicProduct) → catálogo/busca/categoria/relacionados/produto/sitemap/SEO;
 * MOSTRAR NA HOME (showsOnHome) → só a Home; DESTAQUE (featured) → prioridade na Home.
 * showOnStorefront=false esconde de tudo; showOnHome=false esconde só da Home.
 */
describe('visibilidade de produto', () => {
  const base = loadSeedCatalog()
  const goblin = base.find((product) => /goblin/i.test(product.title))!
  const withPatch = (patch: Partial<(typeof base)[number]>) =>
    base.map((product) => (product.id === goblin.id ? { ...product, ...patch } : product))
  const cat = (catalog: typeof base) => filterAndSortProducts(catalog, { query: '', category: 'todos', priceRange: 'all', sort: 'recentes' })
  const search = (catalog: typeof base, query: string) => filterAndSortProducts(catalog, { query, category: 'todos', priceRange: 'all', sort: 'recentes' })

  it('produto publicado aparece no catálogo, busca e home', () => {
    expect(isPublicProduct(goblin)).toBe(true)
    expect(cat(base).some((product) => product.id === goblin.id)).toBe(true)
    expect(search(base, 'goblin').some((product) => product.id === goblin.id)).toBe(true)
    expect(selectHomeFeatured(base, 30).some((product) => product.id === goblin.id)).toBe(true)
  })

  describe('showOnStorefront=false → oculto em TODAS as superfícies públicas', () => {
    const hiddenCatalog = withPatch({ showOnStorefront: false })
    const hidden = hiddenCatalog.find((product) => product.id === goblin.id)!

    it('isPublicProduct e showsOnHome false', () => {
      expect(isPublicProduct(hidden)).toBe(false)
      expect(showsOnHome(hidden)).toBe(false)
    })
    it('some do catálogo', () => expect(cat(hiddenCatalog).some((p) => p.id === goblin.id)).toBe(false))
    it('some da busca', () => expect(search(hiddenCatalog, 'goblin').some((p) => p.id === goblin.id)).toBe(false))
    it('some da home', () => expect(selectHomeFeatured(hiddenCatalog, 30).some((p) => p.id === goblin.id)).toBe(false))
    it('some de produtos relacionados na página de produto', () => {
      const other = base.find((product) => product.id !== goblin.id && isPublicProduct(product))!
      const related = hiddenCatalog.filter((item) => isPublicProduct(item) && item.id !== other.id)
      expect(related.some((p) => p.id === goblin.id)).toBe(false)
    })
    it('some dos guias (productsForGuide)', () => {
      const guide = GUIDES.find((g) => g.slug === 'goblins-rpg')!
      expect(productsForGuide(guide, hiddenCatalog).some((p) => p.id === goblin.id)).toBe(false)
    })
    it('não entra no sitemap', () => {
      const paths = sitemapPaths(hiddenCatalog.filter(isPublicProduct).map((p) => ({ slug: p.slug, category: p.category })))
      expect(paths).not.toContain(`/produto/${goblin.slug}`)
    })
    it('URL direta não indexável (noindex no cliente) e sem Product schema', () => {
      const meta = metadataForRoute(`/produto/${goblin.slug}`, '', hiddenCatalog)
      expect(meta.robots).toBe('noindex, follow')
      expect(meta.structuredData.some((entry) => entry['@type'] === 'Product')).toBe(false)
    })
  })

  describe('showOnHome=false → some SÓ da Home, permanece público no resto', () => {
    const homeHiddenCatalog = withPatch({ showOnHome: false })
    const homeHidden = homeHiddenCatalog.find((product) => product.id === goblin.id)!

    it('continua PUBLICADO mas não visível na Home', () => {
      expect(isPublicProduct(homeHidden)).toBe(true)
      expect(showsOnHome(homeHidden)).toBe(false)
    })
    it('continua no catálogo e na busca', () => {
      expect(cat(homeHiddenCatalog).some((p) => p.id === goblin.id)).toBe(true)
      expect(search(homeHiddenCatalog, 'goblin').some((p) => p.id === goblin.id)).toBe(true)
    })
    it('continua no sitemap e indexável', () => {
      const paths = sitemapPaths(homeHiddenCatalog.filter(isPublicProduct).map((p) => ({ slug: p.slug, category: p.category })))
      expect(paths).toContain(`/produto/${goblin.slug}`)
      expect(metadataForRoute(`/produto/${goblin.slug}`, '', homeHiddenCatalog).robots).toBe('index, follow')
    })
    it('some da Home (featured e contagem de categoria)', () => {
      expect(selectHomeFeatured(homeHiddenCatalog, 30).some((p) => p.id === goblin.id)).toBe(false)
      const before = homeCategories(base).find((c) => c.slug === 'kits-exercitos')?.productCount ?? 0
      const after = homeCategories(homeHiddenCatalog).find((c) => c.slug === 'kits-exercitos')?.productCount ?? 0
      expect(after).toBeLessThanOrEqual(before)
    })
  })
})
