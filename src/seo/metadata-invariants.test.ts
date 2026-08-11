// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GUIDE_INDEX } from '../content/guides-index'
import { loadSeedCatalog } from '../data/seed-loader'
import { isPublicProduct } from '../domain/storefront-presentation'
import { edgeMetadataForRoute } from './edge-metadata'
import { SEO_LANDINGS } from './landing-pages'
import { metadataForRoute, SITE_ORIGIN } from './metadata'

/**
 * Invariantes de metadata sobre TODAS as URLs indexáveis (não amostra): canonical limpo e
 * absoluto, robots válido, JSON-LD estruturalmente são (sem null/undefined, breadcrumb que
 * resolve, Product coerente sem avaliação inventada) e paridade cliente↔edge no robots.
 */
const products = loadSeedCatalog()
const publicProducts = products.filter(isPublicProduct)
const guideSlugs = new Set(GUIDE_INDEX.map((guide) => guide.slug))
const productSlugs = new Set(publicProducts.map((product) => product.slug))
const categories = new Set(publicProducts.map((product) => product.category))
const landingPaths = new Set(SEO_LANDINGS.map((landing) => landing.path))
const staticIndexable = ['/', '/guias', '/categoria/todos', '/faq', '/contato', '/politica-de-privacidade', '/termos']

const resolves = (url: string): boolean => {
  const path = url.startsWith(SITE_ORIGIN) ? url.slice(SITE_ORIGIN.length) || '/' : url
  const clean = path.split(/[?#]/)[0]
  if (staticIndexable.includes(clean) || landingPaths.has(clean) || clean === '/favoritos' || clean === '/comparar') return true
  const guide = clean.match(/^\/guias\/(.+)$/); if (guide) return guideSlugs.has(guide[1])
  const product = clean.match(/^\/produto\/(.+)$/); if (product) return productSlugs.has(product[1])
  const category = clean.match(/^\/categoria\/(.+)$/); if (category) return clean === '/categoria/todos' || categories.has(category[1])
  return false
}

/** Caminhos até valores null/undefined dentro do JSON-LD (não deveriam existir). */
function nullPaths(value: unknown, trail = 'schema'): string[] {
  if (value === null || value === undefined) return [trail]
  if (Array.isArray(value)) return value.flatMap((item, index) => nullPaths(item, `${trail}[${index}]`))
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => nullPaths(item, `${trail}.${key}`))
  return []
}
const breadcrumbItems = (schema: Record<string, unknown>[]) =>
  (schema.find((entry) => entry['@type'] === 'BreadcrumbList')?.itemListElement as Array<{ item: string }> | undefined) ?? []

const indexableUrls = [
  ...staticIndexable,
  ...[...landingPaths],
  ...GUIDE_INDEX.map((guide) => `/guias/${guide.slug}`),
  ...publicProducts.map((product) => `/produto/${product.slug}`),
]

describe('invariantes de metadata em todas as URLs indexáveis', () => {
  it('gera canonical absoluto, limpo e único por URL', () => {
    const seen = new Map<string, string>()
    for (const path of indexableUrls) {
      const { canonical } = metadataForRoute(path, '', products)
      expect(canonical, path).toBe(`${SITE_ORIGIN}${path === '/' ? '/' : path}`)
      expect(canonical.startsWith('https://distritogeek.com.br'), path).toBe(true)
      expect(canonical.includes('?'), path).toBe(false)
      if (path !== '/') expect(canonical.endsWith('/'), path).toBe(false)
      expect(seen.has(canonical), `canonical duplicado: ${canonical} (${path} e ${seen.get(canonical)})`).toBe(false)
      seen.set(canonical, path)
    }
  })

  it('emite title e description não vazios e robots válido', () => {
    for (const path of indexableUrls) {
      const meta = metadataForRoute(path, '', products)
      expect(meta.title.trim().length, path).toBeGreaterThan(0)
      expect(meta.description.trim().length, path).toBeGreaterThan(0)
      expect(meta.description.length, `${path} description longa`).toBeLessThanOrEqual(320)
      expect(['index, follow', 'noindex, follow'], path).toContain(meta.robots)
      expect(path.startsWith('/guias/') || path.startsWith('/produto/') ? meta.robots : 'index, follow', path).toBe('index, follow')
    }
  })

  it('aponta og:image para uma imagem absoluta em toda URL indexável', () => {
    for (const path of indexableUrls) {
      const { image } = metadataForRoute(path, '', products)
      expect(image.startsWith('https://distritogeek.com.br'), `${path} og:image: ${image}`).toBe(true)
    }
  })

  it('devolve 404 real na edge para produto, guia e categoria inexistentes', () => {
    const edgeProducts = publicProducts.map((product) => ({ ...product, listings: product.listings }))
    for (const path of ['/produto/nao-existe-mlb0', '/guias/guia-que-nao-existe', '/categoria/categoria-inexistente', '/rota-aleatoria']) {
      expect(edgeMetadataForRoute(path, '', edgeProducts).status, path).toBe(404)
    }
  })

  it('produz JSON-LD são: sem null/undefined e com breadcrumb que resolve', () => {
    for (const path of indexableUrls) {
      const { structuredData } = metadataForRoute(path, '', products)
      expect(() => JSON.stringify(structuredData), path).not.toThrow()
      expect(nullPaths(structuredData), `${path}: valores nulos no JSON-LD`).toEqual([])
      for (const item of breadcrumbItems(structuredData)) expect(resolves(item.item), `${path} breadcrumb -> ${item.item}`).toBe(true)
    }
  })

  it('declara Product coerente para todo produto com listing ativo, sem avaliação inventada', () => {
    for (const product of publicProducts) {
      const { structuredData } = metadataForRoute(`/produto/${product.slug}`, '', products)
      const schema = structuredData.find((entry) => entry['@type'] === 'Product') as Record<string, unknown> | undefined
      if (!product.listings.some((listing) => listing.active)) continue
      expect(schema, product.slug).toBeTruthy()
      expect(schema!.sku, product.slug).toBe(product.id)
      expect(schema!.url, product.slug).toBe(`${SITE_ORIGIN}/produto/${product.slug}`)
      expect(schema!.aggregateRating, product.slug).toBeUndefined()
      expect(schema!.review, product.slug).toBeUndefined()
      const offers = schema!.offers as Record<string, unknown>
      expect(offers.price, product.slug).toBe(product.price)
      expect(offers.priceCurrency, product.slug).toBe('BRL')
      expect(['https://schema.org/InStock', 'https://schema.org/OutOfStock'], product.slug).toContain(offers.availability)
    }
  })

  it('mantém cliente e edge de acordo no robots e status para produtos e guias', () => {
    const edgeProducts = publicProducts.map((product) => ({ ...product, listings: product.listings }))
    for (const product of publicProducts) {
      const path = `/produto/${product.slug}`
      const edge = edgeMetadataForRoute(path, '', edgeProducts)
      expect(edge.status, path).toBe(200)
      expect(edge.metadata.robots, path).toBe(metadataForRoute(path, '', products).robots)
    }
    for (const slug of guideSlugs) {
      const path = `/guias/${slug}`
      const edge = edgeMetadataForRoute(path, '', edgeProducts)
      expect(edge.status, path).toBe(200)
      expect(edge.metadata.robots, path).toBe('index, follow')
    }
  })
})
