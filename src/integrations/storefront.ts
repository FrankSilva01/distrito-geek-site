import type { Marketplace, Product, ProductStatus } from '../domain/product'

export type StorefrontListing = {
  marketplace?: string
  external_id?: string
  title?: string
  description?: string
  category?: string
  price?: number
  status?: string
  marketplace_url?: string
  image_url?: string
  images?: string[]
  available_quantity?: number
  featured?: boolean
  updated_at?: string
  raw_payload?: Record<string, unknown>
}

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const marketplaceId = (value = ''): Marketplace => {
  const normalized = value.toLowerCase()
  if (normalized.includes('mercado')) return 'mercado-livre'
  if (normalized.includes('shopee')) return 'shopee'
  return 'other'
}

const statusId = (value = ''): ProductStatus => {
  if (value.toLowerCase() === 'active') return 'published'
  if (value.toLowerCase() === 'paused') return 'paused'
  return 'archived'
}

const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const storefrontCategory = (category: string, title: string) => {
  const value = `${category} ${title}`.toLowerCase()
  if (/action.figure|figure|pokemon|anime|colecion/.test(value)) return 'action-figures'
  if (/miniature|miniatura|rpg|wargame|goblin|drag[aã]o|esqueleto/.test(value)) return 'miniaturas-rpg'
  return 'utilidades-geek'
}

export function mapStorefrontProduct(row: StorefrontListing): Product {
  const payload = row.raw_payload ?? {}
  const externalId = stringValue(row.external_id) || 'sem-id'
  const marketplaceTitle = stringValue(row.title) || 'Produto sem título'
  const title = stringValue(payload.storefront_title) || stringValue(payload.storefrontTitle) || marketplaceTitle
  const overrideImage = stringValue(payload.storefront_image) || stringValue(payload.storefrontImage)
  const sourceImages = Array.isArray(row.images) ? row.images.filter(Boolean) : []
  const images = [...new Set([overrideImage, ...sourceImages, stringValue(row.image_url)].filter((url) => url.startsWith('https://') || url.startsWith('/')))]
  const updatedAt = stringValue(row.updated_at) || new Date(0).toISOString()
  const marketplace = marketplaceId(row.marketplace)
  const category = storefrontCategory(stringValue(row.category), marketplaceTitle)
  const featured = Boolean(payload.featured ?? row.featured)
  const status = statusId(row.status)

  return {
    id: externalId,
    slug: `${slugify(title)}-${externalId.toLowerCase()}`,
    title,
    description: stringValue(row.description) || `Confira os detalhes, disponibilidade e condições deste produto no anúncio oficial do marketplace.`,
    price: Number(row.price || 0),
    currency: 'BRL',
    stock: Math.max(0, Number(row.available_quantity || 0)),
    status,
    category,
    images: images.length ? images : ['/assets/product-placeholder.webp'],
    attributes: {
      Marketplace: stringValue(row.marketplace) || 'Marketplace',
      ...(title !== marketplaceTitle ? { 'Título no marketplace': marketplaceTitle } : {}),
    },
    featured,
    listings: row.marketplace_url ? [{ marketplace, externalId, url: row.marketplace_url, active: status === 'published' }] : [],
    version: 1,
    createdAt: updatedAt,
    updatedAt,
  }
}

export async function loadStorefrontCatalog(
  endpoint: string,
  fetcher: typeof fetch = fetch,
): Promise<Product[]> {
  const response = await fetcher(endpoint, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error('Catálogo sincronizado indisponível')
  const body = await response.json() as { ok?: boolean; products?: StorefrontListing[] }
  if (!body.ok || !Array.isArray(body.products)) throw new Error('Catálogo sincronizado indisponível')
  return body.products.map(mapStorefrontProduct).filter((product) => product.id !== 'sem-id')
}
