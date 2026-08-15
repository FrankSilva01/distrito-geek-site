import type { Marketplace, Product } from '../domain/product'
import { isAllowedMarketplaceUrl } from '../domain/product'
import { CURATED_PRODUCT_FAMILIES, familyForProduct } from '../domain/product-family'
import { displayTitle, isPublicProduct } from '../domain/storefront-presentation'

export const COMMERCIAL_MIN_PRODUCT_VIEWS = 10
export const COMMERCIAL_LOW_CTR = 0.1

export type CommercialMetricRow = {
  path: string
  title: string
  views: number
  users: number
  mercadoLivreClicks: number
  shopeeClicks: number
  tiktokClicks: number
  whatsappClicks: number
}

export type CommercialProductStatus = 'SEM DADOS' | 'POUCOS DADOS' | 'BOM INTERESSE' | 'BAIXO CLIQUE' | 'SEM CTA' | 'ATENÇÃO'
type CommercialChannel = 'mercado-livre' | 'shopee' | 'tiktok' | 'whatsapp'

const clickFor = (row: CommercialMetricRow, channel: CommercialChannel) => channel === 'mercado-livre' ? row.mercadoLivreClicks
  : channel === 'shopee' ? row.shopeeClicks
    : channel === 'tiktok' ? row.tiktokClicks
      : row.whatsappClicks

const slugFromPath = (path: string) => {
  try { return new URL(path, 'https://distritogeek.com.br').pathname.match(/^\/produto\/([^/]+)/)?.[1] || '' }
  catch { return '' }
}

const activeListing = (product: Product, marketplace: Marketplace) => product.listings.find((listing) => listing.marketplace === marketplace && listing.active && isAllowedMarketplaceUrl(listing.url))
const associatedListing = (product: Product, marketplace: Marketplace) => product.listings.find((listing) => listing.marketplace === marketplace && listing.active)
const listingCoverage = (product: Product, marketplace: Marketplace) => {
  const associated = associatedListing(product, marketplace)
  const active = activeListing(product, marketplace)
  if (active) return { status: 'Anúncio associado', price: active.price ?? product.price }
  if (associated) return { status: 'URL ausente', price: associated.price }
  return { status: 'Sem anúncio', price: undefined }
}

function readiness(product: Product): string[] {
  const missing: string[] = []
  if (!product.sku) missing.push('SKU DG')
  if (!displayTitle(product).trim()) missing.push('título')
  if (product.description.trim().length < 20) missing.push('descrição')
  if (product.price <= 0) missing.push('preço')
  if (!product.images.length) missing.push('imagem principal')
  return missing
}

export function buildCommercialInsights(products: Product[], metricRows: CommercialMetricRow[]) {
  const metrics = new Map(metricRows.map((row) => [slugFromPath(row.path), row]))
  // Inclui produtos marcados para publicação mesmo se uma inconsistência os impedir de
  // passar em isPublicProduct. Assim o Admin encontra a página sem saída em vez de ocultá-la.
  const intendedPublic = products.filter((product) => product.status === 'published' && product.showOnStorefront !== false)
  const productInsights = intendedPublic.map((product) => {
    const row = metrics.get(product.slug) || { path: `/produto/${product.slug}`, title: displayTitle(product), views: 0, users: 0, mercadoLivreClicks: 0, shopeeClicks: 0, tiktokClicks: 0, whatsappClicks: 0 }
    const mercadoLivre = activeListing(product, 'mercado-livre')
    const shopee = activeListing(product, 'shopee')
    const tiktok = activeListing(product, 'tiktok')
    const hasMarketplace = Boolean(mercadoLivre || shopee || tiktok)
    const hasInvalidMarketplaceUrl = (['mercado-livre', 'shopee', 'tiktok'] as Marketplace[]).some((marketplace) => associatedListing(product, marketplace) && !activeListing(product, marketplace))
    const totalCommercialClicks = row.mercadoLivreClicks + row.shopeeClicks + row.tiktokClicks + row.whatsappClicks
    const commercialCtr = row.views ? totalCommercialClicks / row.views : 0
    const missingRequirements = readiness(product)
    const family = familyForProduct(product.id, CURATED_PRODUCT_FAMILIES)
    const diagnostics: string[] = []
    if (!hasMarketplace) diagnostics.push('Produto marcado como público sem canal de compra ativo.')
    if (hasInvalidMarketplaceUrl) diagnostics.push('Produto possui canal associado, mas a URL de compra está ausente ou inválida.')
    if (!product.images.length) diagnostics.push('Produto sem imagem principal.')
    else if (product.images.length === 1) diagnostics.push('Produto possui apenas uma imagem; pode merecer revisão da apresentação.')
    if (!family) diagnostics.push('Produto ainda não pertence a uma família curada.')
    if (!product.relatedProducts?.length && !family) diagnostics.push('Produto sem relação comercial curada.')
    if (missingRequirements.length) diagnostics.push(`Informação comercial incompleta: ${missingRequirements.join(', ')}.`)
    let status: CommercialProductStatus
    if (!hasMarketplace) status = 'SEM CTA'
    else if (missingRequirements.length) status = 'ATENÇÃO'
    else if (!row.views) status = 'SEM DADOS'
    else if (row.views < COMMERCIAL_MIN_PRODUCT_VIEWS) status = 'POUCOS DADOS'
    else if (commercialCtr < COMMERCIAL_LOW_CTR) status = 'BAIXO CLIQUE'
    else status = 'BOM INTERESSE'
    if (status === 'BAIXO CLIQUE') diagnostics.unshift(totalCommercialClicks
      ? 'Recebeu visualizações suficientes, mas a taxa de clique comercial está abaixo do limite de referência.'
      : 'Recebeu visualizações suficientes, mas ainda não registrou clique comercial.')
    return {
      id: product.id, sku: product.sku || '—', slug: product.slug, path: row.path, title: displayTitle(product), family: family?.name || 'Sem família',
      views: row.views, users: row.users, mercadoLivreClicks: row.mercadoLivreClicks, shopeeClicks: row.shopeeClicks,
      tiktokClicks: row.tiktokClicks, whatsappClicks: row.whatsappClicks, totalCommercialClicks, commercialCtr, status, diagnostics,
      hasActiveMarketplace: hasMarketplace, readyForMarketplace: missingRequirements.length === 0, missingRequirements,
      coverage: {
        distritoGeek: isPublicProduct(product) ? 'Disponível' : 'Atenção',
        mercadoLivre: listingCoverage(product, 'mercado-livre'),
        shopee: listingCoverage(product, 'shopee'),
        tiktok: listingCoverage(product, 'tiktok'),
      },
    }
  }).sort((a, b) => b.views - a.views || b.totalCommercialClicks - a.totalCommercialClicks || a.title.localeCompare(b.title, 'pt-BR'))

  const productViews = productInsights.reduce((sum, item) => sum + item.views, 0)
  const commercialClicks = productInsights.reduce((sum, item) => sum + item.totalCommercialClicks, 0)
  const channelDefinitions: Array<{ channel: CommercialChannel; label: string; kind: 'marketplace' | 'auxiliar' }> = [
    { channel: 'mercado-livre', label: 'Mercado Livre', kind: 'marketplace' },
    { channel: 'shopee', label: 'Shopee', kind: 'marketplace' },
    { channel: 'tiktok', label: 'TikTok Shop', kind: 'marketplace' },
    { channel: 'whatsapp', label: 'WhatsApp', kind: 'auxiliar' },
  ]
  const channels = channelDefinitions.map((definition) => {
    const covered = intendedPublic.filter((product) => definition.channel === 'whatsapp' ? isPublicProduct(product) : Boolean(activeListing(product, definition.channel)))
    const coveredIds = new Set(covered.map((product) => product.id))
    const coveredInsights = productInsights.filter((item) => coveredIds.has(item.id))
    const clicks = coveredInsights.reduce((sum, item) => sum + clickFor(item, definition.channel), 0)
    const viewsWithCoverage = coveredInsights.reduce((sum, item) => sum + item.views, 0)
    return { ...definition, clicks, productsWithLink: covered.length, productsWithoutCoverage: intendedPublic.length - covered.length, viewsWithCoverage, ctr: viewsWithCoverage ? clicks / viewsWithCoverage : 0 }
  })

  const families = CURATED_PRODUCT_FAMILIES.filter((family) => family.published).map((family) => {
    const ids = new Set(family.productIds)
    const rows = productInsights.filter((item) => ids.has(item.id))
    const views = rows.reduce((sum, item) => sum + item.views, 0)
    const clicks = rows.reduce((sum, item) => sum + item.totalCommercialClicks, 0)
    return { family: family.name, products: rows.length, views, commercialClicks: clicks, commercialCtr: views ? clicks / views : 0 }
  }).filter((family) => family.products > 0).sort((a, b) => b.views - a.views || b.commercialClicks - a.commercialClicks)

  return {
    funnel: { productViews, commercialClicks, commercialCtr: productViews ? commercialClicks / productViews : 0 },
    products: productInsights,
    attentionProducts: productInsights.filter((item) => item.status === 'BAIXO CLIQUE' || item.status === 'SEM CTA' || item.status === 'ATENÇÃO'),
    uncoveredProducts: productInsights.filter((item) => !item.hasActiveMarketplace),
    channels,
    families,
    readyProducts: productInsights.filter((item) => item.readyForMarketplace),
  }
}

export type CommercialInsights = ReturnType<typeof buildCommercialInsights>
