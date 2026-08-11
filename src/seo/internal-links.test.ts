// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GUIDES } from '../content/guides'
import { GUIDE_INDEX } from '../content/guides-index'
import { loadSeedCatalog } from '../data/seed-loader'
import { isPublicProduct } from '../domain/storefront-presentation'
import { SEO_LANDINGS } from './landing-pages'

/**
 * Integridade dos links internos gerados pelo conteúdo. Todo destino interno (section.links dos
 * guias, categoryPath, relatedGuideSlugs, guideSlugs das landings, relatedPaths) precisa
 * resolver para uma rota real: guia existente, produto publicado, landing, categoria de produto
 * real ou rota estática conhecida. Guarda contra 404 interna silenciosa quando alguém adicionar
 * um guia/landing com slug errado.
 */
describe('integridade dos links internos', () => {
  const products = loadSeedCatalog()
  const publicProducts = products.filter(isPublicProduct)
  const guideSlugs = new Set(GUIDE_INDEX.map((guide) => guide.slug))
  const productSlugs = new Set(publicProducts.map((product) => product.slug))
  const categories = new Set(publicProducts.map((product) => product.category))
  const landingPaths = new Set(SEO_LANDINGS.map((landing) => landing.path))
  const staticRoutes = new Set(['/', '/guias', '/faq', '/contato', '/politica-de-privacidade', '/termos', '/favoritos', '/comparar', '/categoria/todos'])

  const resolves = (path: string): boolean => {
    const clean = path.split(/[?#]/)[0]
    if (staticRoutes.has(clean) || landingPaths.has(clean)) return true
    const guide = clean.match(/^\/guias\/(.+)$/)
    if (guide) return guideSlugs.has(guide[1])
    const product = clean.match(/^\/produto\/(.+)$/)
    if (product) return productSlugs.has(product[1])
    const category = clean.match(/^\/categoria\/(.+)$/)
    if (category) return categories.has(category[1])
    return false
  }

  it('resolve todos os section.links e categoryPath dos guias', () => {
    const broken: string[] = []
    for (const guide of GUIDES) {
      if (!resolves(guide.categoryPath)) broken.push(`${guide.slug} categoryPath -> ${guide.categoryPath}`)
      for (const section of guide.sections)
        for (const link of section.links ?? [])
          if (link.to.startsWith('/') && !resolves(link.to)) broken.push(`${guide.slug} section.link -> ${link.to}`)
    }
    expect(broken).toEqual([])
  })

  it('resolve todos os relatedGuideSlugs', () => {
    const broken: string[] = []
    for (const guide of GUIDES)
      for (const related of guide.relatedGuideSlugs)
        if (!guideSlugs.has(related)) broken.push(`${guide.slug} -> ${related}`)
    expect(broken).toEqual([])
  })

  it('resolve todos os guideSlugs e relatedPaths das landings', () => {
    const broken: string[] = []
    for (const landing of SEO_LANDINGS) {
      for (const slug of landing.guideSlugs) if (!guideSlugs.has(slug)) broken.push(`${landing.path} guideSlug -> ${slug}`)
      for (const related of landing.relatedPaths) if (!resolves(related)) broken.push(`${landing.path} relatedPath -> ${related}`)
    }
    expect(broken).toEqual([])
  })
})
