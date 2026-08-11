// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GUIDE_INDEX } from '../content/guides-index'
import { loadSeedCatalog } from '../data/seed-loader'
import { edgeMetadataForRoute } from './edge-metadata'
import { SEO_LANDINGS } from './landing-pages'
import { metadataForRoute, SITE_ORIGIN } from './metadata'
import { sitemapPaths } from '../../netlify/functions/sitemap'

const products = loadSeedCatalog()
const publicProducts = products.filter((product) => product.status === 'published' && product.showOnStorefront !== false && product.listings.some((listing) => listing.active))

/**
 * Auditoria de saúde SEO feita por código: canonical, robots/noindex, 404, sitemap e
 * redirects. Não depende da inspeção de URL do Search Console. Se uma rota indexável
 * passar a vazar query no canonical, apontar para outro domínio, ou uma rota utilitária
 * deixar de ser noindex, algum destes testes falha.
 */
describe('saúde SEO', () => {
  it('mantém canonical absoluto no domínio oficial, sem query e sem barra final', () => {
    const routes = [...GUIDE_INDEX.map((guide) => `/guias/${guide.slug}`), ...SEO_LANDINGS.map((landing) => landing.path), ...publicProducts.map((product) => `/produto/${product.slug}`), '/', '/guias', '/categoria/todos', '/faq', '/contato']
    for (const route of routes) {
      const canonical = metadataForRoute(route, '', products).canonical
      expect(canonical, route).toBe(`${SITE_ORIGIN}${route === '/' ? '/' : route}`)
      expect(canonical.startsWith('https://distritogeek.com.br'), route).toBe(true)
      expect(canonical.includes('?'), route).toBe(false)
      if (route !== '/') expect(canonical.endsWith('/'), route).toBe(false)
    }
  })

  it('indexa guias e produtos e marca páginas utilitárias e filtros como noindex', () => {
    for (const guide of GUIDE_INDEX) expect(metadataForRoute(`/guias/${guide.slug}`, '', products).robots, guide.slug).toBe('index, follow')
    for (const product of publicProducts) expect(metadataForRoute(`/produto/${product.slug}`, '', products).robots, product.slug).toBe('index, follow')
    expect(metadataForRoute('/favoritos', '', products).robots).toBe('noindex, follow')
    expect(metadataForRoute('/comparar', '', products).robots).toBe('noindex, follow')
    // Combinação de filtros na categoria não pode ser indexada (conteúdo duplicado).
    expect(metadataForRoute('/categoria/todos', '?sort=price&maxPrice=100', products).robots).toBe('noindex, follow')
  })

  it('só declara schema Product quando há listing ativo, sem avaliação inventada', () => {
    for (const product of publicProducts) {
      const schema = metadataForRoute(`/produto/${product.slug}`, '', products).structuredData.find((entry) => entry['@type'] === 'Product')
      if (product.listings.some((listing) => listing.active)) {
        expect(schema, product.slug).toBeTruthy()
        expect(schema!.aggregateRating, product.slug).toBeUndefined()
        expect(schema!.review, product.slug).toBeUndefined()
      }
    }
  })

  it('devolve 404 real na edge para rota inexistente e 200 para guia real', () => {
    const edgeProducts = publicProducts.map((product) => ({ ...product, listings: product.listings }))
    expect(edgeMetadataForRoute('/rota-que-nao-existe', '', edgeProducts).status).toBe(404)
    expect(edgeMetadataForRoute(`/guias/${GUIDE_INDEX[0].slug}`, '', edgeProducts).status).toBe(200)
    expect(edgeMetadataForRoute('/favoritos', '', edgeProducts).metadata.robots).toBe('noindex, follow')
  })

  it('inclui todo guia, landing e produto publicado no sitemap, sem rotas noindex', () => {
    const paths = sitemapPaths(publicProducts.map((product) => ({ slug: product.slug, category: product.category })))
    for (const guide of GUIDE_INDEX) expect(paths, guide.slug).toContain(`/guias/${guide.slug}`)
    for (const landing of SEO_LANDINGS) expect(paths, landing.path).toContain(landing.path)
    for (const product of publicProducts) expect(paths, product.slug).toContain(`/produto/${product.slug}`)
    // Rotas privadas/utilitárias jamais entram no sitemap.
    for (const forbidden of ['/favoritos', '/comparar', '/admin']) expect(paths).not.toContain(forbidden)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('publica robots e redirects coerentes com a política de indexação', () => {
    const robots = readFileSync('public/robots.txt', 'utf8')
    expect(robots).toMatch(/Disallow:\s*\/admin/)
    expect(robots).toContain('Sitemap: https://distritogeek.com.br/sitemap.xml')
    const netlify = readFileSync('netlify.toml', 'utf8')
    // www redireciona permanentemente para o domínio sem www.
    expect(netlify).toMatch(/from = "https:\/\/www\.distritogeek\.com\.br\/\*"/)
    expect(netlify).toMatch(/status = 301/)
    expect(netlify).toContain('/.netlify/functions/sitemap')
  })
})
