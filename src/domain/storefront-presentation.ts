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

/**
 * PUBLICADO: aparece em todas as superfícies públicas (catálogo, categoria, busca, relacionados,
 * página de produto, sitemap, structured data). É o portão mestre de visibilidade pública.
 */
export function isPublicProduct(product: Product): boolean {
  return product.status === 'published' && product.showOnStorefront !== false && canPublishProduct(product)
}

/**
 * MOSTRAR NA HOME: subconjunto de PUBLICADO. Um produto publicado com `showOnHome === false`
 * continua público em catálogo/categoria/busca/produto, mas não aparece na Home nem em vitrines
 * editoriais. `showOnHome` ausente conta como visível (default true, retrocompatível).
 */
export function showsOnHome(product: Product): boolean {
  return isPublicProduct(product) && product.showOnHome !== false
}
