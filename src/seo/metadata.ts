import type { Product } from '../domain/product'
import { displayTitle, isPublicProduct } from '../domain/storefront-presentation'
// Índice leve de propósito: importar o corpo dos guias aqui traria a prosa de todos os
// artigos para o bundle inicial, já que a política de metadata roda em toda rota.
import { guideSummaryBySlug } from '../content/guides-index'
import { landingByPath, landingForProduct, productsForLanding } from './landing-pages'

export const SITE_ORIGIN = 'https://distritogeek.com.br'
export type Breadcrumb = { name: string; url: string }
export type PageMetadata = { title: string; description: string; canonical: string; robots: 'index, follow' | 'noindex, follow'; image: string; type: 'website' | 'product' | 'article'; breadcrumbs: Breadcrumb[]; structuredData: Record<string, unknown>[] }
const concise = (value: string, limit = 160) => { const plain = value.replace(/\s+/g, ' ').trim(); return plain.length <= limit ? plain : `${plain.slice(0, limit - 1).replace(/\s+\S*$/, '')}…` }
const withBrand = (title: string) => title.includes('| Distrito Geek') ? title : `${title} | Distrito Geek`
const absolute = (value: string) => new URL(value, SITE_ORIGIN).href
const baseData = (): Record<string, unknown>[] => [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Distrito Geek', url: SITE_ORIGIN }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Distrito Geek', url: SITE_ORIGIN }]
const breadcrumbData = (items: Breadcrumb[]) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) })

export function metadataForRoute(pathname: string, search: string, products: Product[]): PageMetadata {
  const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '')
  const canonical = `${SITE_ORIGIN}${path}`
  const home: Breadcrumb = { name: 'Início', url: `${SITE_ORIGIN}/` }
  const guideMatch = path.match(/^\/guias\/([^/]+)$/)
  const guide = guideMatch ? guideSummaryBySlug(guideMatch[1]) : undefined
  if (guide) {
    const breadcrumbs = [home, { name: 'Guias', url: `${SITE_ORIGIN}/guias` }, { name: guide.title, url: canonical }]
    return { title: withBrand(guide.seoTitle), description: guide.seoDescription, canonical, robots: 'index, follow', image: `${SITE_ORIGIN}/assets/hero-distrito-geek.webp`, type: 'article', breadcrumbs, structuredData: [...baseData(), breadcrumbData(breadcrumbs), { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.seoDescription, datePublished: guide.updatedAt, dateModified: guide.updatedAt, mainEntityOfPage: canonical, author: { '@type': 'Organization', name: 'Distrito Geek' }, publisher: { '@type': 'Organization', name: 'Distrito Geek' } }] }
  }
  const product = products.find((item) => path === `/produto/${item.slug}` && isPublicProduct(item))
  if (product) {
    const name = displayTitle(product), landing = landingForProduct(product), listing = product.listings.find((item) => item.active)
    const description = concise(product.seoDescription || product.storefrontDescription || product.description || `Conheça ${name}.`)
    const breadcrumbs = [home, { name: landing.h1, url: `${SITE_ORIGIN}${landing.path}` }, { name, url: canonical }]
    const structuredData: Record<string, unknown>[] = [...baseData(), breadcrumbData(breadcrumbs)]
    // `url` é a página desta vitrine; `offers.url` é onde a compra acontece. Sem
    // aggregateRating nem review: não existe avaliação própria para declarar.
    if (listing) structuredData.push({ '@context': 'https://schema.org', '@type': 'Product', name, image: product.images.map(absolute), description, sku: product.id, url: canonical, category: product.category, offers: { '@type': 'Offer', priceCurrency: 'BRL', price: product.price, availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: listing.url } })
    return { title: withBrand(product.seoTitle || name), description, canonical, robots: 'index, follow', image: absolute(product.images[0]), type: 'product', breadcrumbs, structuredData }
  }
  const landing = landingByPath(path)
  if (landing) {
    const matches = productsForLanding(landing, products), breadcrumbs = [home, { name: landing.h1, url: canonical }]
    return { title: withBrand(landing.title), description: landing.description, canonical, robots: matches.length ? 'index, follow' : 'noindex, follow', image: absolute(matches[0]?.images[0] || '/assets/hero-distrito-geek.webp'), type: 'website', breadcrumbs, structuredData: [...baseData(), breadcrumbData(breadcrumbs)] }
  }
  const routes: Record<string, [string, string]> = {
    '/categoria/todos': ['Catálogo Geek | Distrito Geek', 'Explore miniaturas RPG, action figures, kits e colecionáveis em anúncios oficiais.'],
    '/guias': ['Guias de Miniaturas, RPG e Colecionismo | Distrito Geek', 'Guias práticos sobre escala, pintura, conservação e escolha de miniaturas para RPG e coleção.'],
    '/favoritos': ['Seus favoritos | Distrito Geek', 'Produtos que você salvou para consultar novamente.'],
    '/comparar': ['Comparar produtos | Distrito Geek', 'Compare produtos selecionados antes de abrir o anúncio oficial.'],
    '/faq': ['Perguntas frequentes | Distrito Geek', 'Entenda como consultar produtos e finalizar sua compra no marketplace.'],
    '/contato': ['Contato | Distrito Geek', 'Fale com a equipe Distrito Geek sobre produtos, catálogo e atendimento.'],
    '/politica-de-privacidade': ['Política de Privacidade | Distrito Geek', 'Saiba como a Distrito Geek trata dados de contato e preferências de Analytics.'],
    '/termos': ['Termos de uso | Distrito Geek', 'Consulte as condições de uso da vitrine Distrito Geek.'],
  }
  const route = routes[path], filtered = Boolean(search && path.startsWith('/categoria/')), privateUtility = path === '/favoritos' || path === '/comparar'
  const title = route?.[0] || 'Distrito Geek | Miniaturas RPG, Action Figures e Colecionáveis'
  return { title, description: route?.[1] || 'Miniaturas RPG, action figures e colecionáveis selecionados. Veja detalhes e compre no anúncio oficial do marketplace.', canonical, robots: filtered || privateUtility || (!route && path !== '/') ? 'noindex, follow' : 'index, follow', image: `${SITE_ORIGIN}/assets/hero-distrito-geek.webp`, type: 'website', breadcrumbs: path === '/' ? [home] : [home, { name: title.split(' | ')[0], url: canonical }], structuredData: baseData() }
}
