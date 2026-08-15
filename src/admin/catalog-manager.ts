import type { Product } from '../domain/product'
import { isPublicProduct, showsOnHome } from '../domain/storefront-presentation'
import { canPublishProduct } from '../domain/product'
import { guideMatchText, guidesForProduct, type GuideSummary } from '../content/guides-index'
import { CURATED_PRODUCT_FAMILIES, familyForProduct } from '../domain/product-family'

/**
 * Lógica pura do Admin de Catálogo (filtros, busca, saúde, canais, simulador de preço).
 * Sem React e sem `guides.ts` pesado — só o índice leve. Testável isoladamente.
 */

export type VisibilityFilter = 'todos' | 'publicados' | 'ocultos' | 'na-home' | 'fora-home' | 'destaques'
export type ContentFilter = 'todos' | 'sem-descricao' | 'sem-guia' | 'sem-imagem' | 'sem-categoria' | 'sem-familia'
export type ChannelFilter = 'todos' | 'mercado-livre' | 'shopee' | 'tiktok' | 'multicanal' | 'sem-canal'

export type CatalogFilters = { query: string; visibility: VisibilityFilter; content: ContentFilter; channel: ChannelFilter; category: string }
export const emptyFilters: CatalogFilters = { query: '', visibility: 'todos', content: 'todos', channel: 'todos', category: 'todas' }

/** Guias ligados ao produto: o específico (líder) e a contagem, via mecanismo semântico leve. */
export function productGuides(product: Product, catalogHaystacks: string[]): { specific?: GuideSummary; related: GuideSummary[] } {
  const guides = guidesForProduct(guideMatchText(product), catalogHaystacks, 4)
  return { specific: guides[0], related: guides }
}

const activeChannels = (product: Product) => product.listings.filter((listing) => listing.active)

function matchesQuery(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [product.title, product.storefrontTitle, product.marketplaceTitle, product.sku, product.id, product.category, ...(product.seoTags || []), ...product.listings.map((listing) => listing.externalId)]
    .filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q)
}

function matchesVisibility(product: Product, filter: VisibilityFilter): boolean {
  switch (filter) {
    case 'publicados': return isPublicProduct(product)
    case 'ocultos': return !isPublicProduct(product)
    case 'na-home': return showsOnHome(product)
    case 'fora-home': return isPublicProduct(product) && !showsOnHome(product)
    case 'destaques': return isPublicProduct(product) && product.featured
    default: return true
  }
}

function matchesContent(product: Product, filter: ContentFilter, hasGuide: boolean): boolean {
  switch (filter) {
    case 'sem-descricao': return !product.storefrontDescription?.trim()
    case 'sem-guia': return !hasGuide
    case 'sem-imagem': return !product.images.length
    case 'sem-categoria': return !product.category?.trim()
    case 'sem-familia': return !product.familyId && !familyForProduct(product.id, CURATED_PRODUCT_FAMILIES)
    default: return true
  }
}

function matchesChannel(product: Product, filter: ChannelFilter): boolean {
  const channels = new Set(product.listings.map((listing) => listing.marketplace))
  switch (filter) {
    case 'mercado-livre': return channels.has('mercado-livre')
    case 'shopee': return channels.has('shopee')
    case 'tiktok': return channels.has('tiktok')
    case 'multicanal': return product.listings.length > 1
    case 'sem-canal': return product.listings.length === 0
    default: return true
  }
}

export function filterProducts(products: Product[], filters: CatalogFilters, catalogHaystacks: string[]): Product[] {
  return products.filter((product) => {
    const hasGuide = filters.content === 'sem-guia' ? Boolean(productGuides(product, catalogHaystacks).specific) : true
    return matchesQuery(product, filters.query) &&
      matchesVisibility(product, filters.visibility) &&
      matchesContent(product, filters.content, hasGuide) &&
      matchesChannel(product, filters.channel) &&
      (filters.category === 'todas' || product.category === filters.category)
  })
}

export const catalogCategories = (products: Product[]): string[] => [...new Set(products.map((product) => product.category))].filter(Boolean).sort()

// ————— Saúde do produto (OK / pendente / atenção), sem score numérico —————
export type HealthState = 'ok' | 'pendente' | 'atencao'
export type HealthGroup = { group: string; items: Array<{ label: string; state: HealthState }> }

export function productHealth(product: Product, hasSpecificGuide: boolean): HealthGroup[] {
  const ok = (condition: boolean): HealthState => (condition ? 'ok' : 'pendente')
  return [
    { group: 'Publicação', items: [
      { label: 'Publicado no site', state: isPublicProduct(product) ? 'ok' : 'atencao' },
      { label: 'Imagem', state: ok(product.images.length > 0) },
      { label: 'Preço', state: ok(product.price > 0) },
      { label: 'Categoria', state: ok(Boolean(product.category?.trim())) },
    ] },
    { group: 'Conteúdo', items: [
      { label: 'Descrição própria', state: ok(Boolean(product.storefrontDescription?.trim())) },
      { label: 'Guia específico', state: ok(hasSpecificGuide) },
    ] },
    { group: 'SEO', items: [
      { label: 'Título SEO', state: ok(Boolean(product.seoTitle?.trim() || product.storefrontTitle?.trim())) },
      { label: 'Descrição SEO', state: ok(Boolean(product.seoDescription?.trim() || product.storefrontDescription?.trim())) },
      { label: 'Product schema', state: product.listings.some((listing) => listing.active) && canPublishProduct(product) ? 'ok' : 'pendente' },
    ] },
    { group: 'Canais', items: [
      { label: 'Mercado Livre', state: channelState(product, 'mercado-livre') },
      { label: 'Shopee', state: channelState(product, 'shopee') },
      { label: 'TikTok', state: channelState(product, 'tiktok') },
    ] },
  ]
}
const channelState = (product: Product, marketplace: string): HealthState => {
  const listing = product.listings.find((item) => item.marketplace === marketplace)
  if (!listing) return 'pendente'
  return listing.active ? 'ok' : 'atencao'
}

export const isChannelActive = (product: Product, marketplace: string) => activeChannels(product).some((listing) => listing.marketplace === marketplace)
export const hasChannel = (product: Product, marketplace: string) => product.listings.some((listing) => listing.marketplace === marketplace)

// ————— Simulador de preço (manual, sem taxas hardcoded como permanentes) —————
export type PriceInputs = { price: number; percentFee: number; fixedFee: number; otherCosts: number }
export type PriceResult = { gross: number; percentAmount: number; fixedFee: number; otherCosts: number; net: number }

export function estimateNet({ price, percentFee, fixedFee, otherCosts }: PriceInputs): PriceResult {
  const gross = Math.max(0, price)
  const percentAmount = gross * (Math.max(0, percentFee) / 100)
  const net = gross - percentAmount - Math.max(0, fixedFee) - Math.max(0, otherCosts)
  return { gross, percentAmount, fixedFee: Math.max(0, fixedFee), otherCosts: Math.max(0, otherCosts), net }
}

/** Presets de taxa por canal — valores iniciais editáveis, NÃO fixos/permanentes. */
export const CHANNEL_FEE_PRESETS: Record<string, { percentFee: number; fixedFee: number; label: string }> = {
  'mercado-livre': { percentFee: 12, fixedFee: 6, label: 'Mercado Livre' },
  shopee: { percentFee: 14, fixedFee: 4, label: 'Shopee' },
  tiktok: { percentFee: 8, fixedFee: 0, label: 'TikTok Shop' },
}
