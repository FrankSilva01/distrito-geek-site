import { canPublishProduct, type Product } from './product'

export function normalizeStorefrontTitle(title: string): string {
  return title
    .replace(/\bRpg\b/gi, 'RPG')
    .replace(/\b8k\b/gi, '8K')
    .replace(/\bD\s*&\s*d\b/gi, 'D&D')
}

export function displayTitle(product: Product): string {
  return product.storefrontTitle?.trim() || normalizeStorefrontTitle(product.marketplaceTitle || product.title)
}

export function availabilityLabel(product: Product): 'Disponível' | 'Produção sob demanda' | 'Indisponível' {
  const purchasable = product.status === 'published' && product.listings.some((listing) => listing.active)
  if (!purchasable) return 'Indisponível'
  if (product.stock > 0) return 'Disponível'
  return /sob demanda/i.test(`${product.description} ${Object.values(product.attributes).join(' ')}`)
    ? 'Produção sob demanda'
    : 'Indisponível'
}

export function isPublicProduct(product: Product): boolean {
  return product.status === 'published' && product.showOnStorefront !== false && canPublishProduct(product)
}
