import type { Product } from '../domain/product'
import type { ProductFamily } from '../domain/product-family'
import { familyForProduct } from '../domain/product-family'
import { isPublicProduct } from '../domain/storefront-presentation'

export type CatalogExecutiveSummary = {
  total: number; public: number; hidden: number; withoutGuide: number; withoutCategory: number;
  withoutImage: number; withoutChannel: number; withoutFamily: number; priceDivergences: number;
}

const familyOf = (product: Product, families: ProductFamily[]) => product.familyId || familyForProduct(product.id, families)?.id
const activeListings = (product: Product) => product.listings.filter((listing) => listing.active)

export function channelPriceRows(product: Product) {
  const rows = activeListings(product).map((listing) => ({
    marketplace: listing.marketplace, externalId: listing.externalId, url: listing.url, active: listing.active,
    status: listing.status || (listing.active ? 'active' : 'inactive'), lastSyncAt: listing.lastSyncAt,
    price: listing.price ?? product.price, different: false,
  }))
  const prices = new Set(rows.map((row) => row.price.toFixed(2)))
  return rows.map((row) => ({ ...row, different: prices.size > 1 }))
}

export function catalogExecutiveSummary(products: Product[], families: ProductFamily[], productIdsWithGuide: Set<string>): CatalogExecutiveSummary {
  return {
    total: products.length,
    public: products.filter(isPublicProduct).length,
    hidden: products.filter((product) => !isPublicProduct(product)).length,
    withoutGuide: products.filter((product) => !productIdsWithGuide.has(product.id)).length,
    withoutCategory: products.filter((product) => !product.category?.trim()).length,
    withoutImage: products.filter((product) => !product.images.length).length,
    withoutChannel: products.filter((product) => !activeListings(product).length).length,
    withoutFamily: products.filter((product) => !familyOf(product, families)).length,
    priceDivergences: products.filter((product) => channelPriceRows(product).some((row) => row.different)).length,
  }
}

export type CatalogAction = { kind: 'without-guide' | 'without-family' | 'without-category' | 'without-image' | 'without-channel' | 'price-divergence'; count: number; label: string; filter: string }

export function catalogActionQueue(products: Product[], families: ProductFamily[], productIdsWithGuide: Set<string>): CatalogAction[] {
  const summary = catalogExecutiveSummary(products, families, productIdsWithGuide)
  return [
    { kind: 'without-guide', count: summary.withoutGuide, label: 'produtos sem guia específico', filter: 'sem-guia' },
    { kind: 'without-family', count: summary.withoutFamily, label: 'produtos sem família', filter: 'sem-familia' },
    { kind: 'without-category', count: summary.withoutCategory, label: 'produtos sem categoria', filter: 'sem-categoria' },
    { kind: 'without-image', count: summary.withoutImage, label: 'produtos sem imagem', filter: 'sem-imagem' },
    { kind: 'without-channel', count: summary.withoutChannel, label: 'produtos sem canal ativo', filter: 'sem-canal' },
    { kind: 'price-divergence', count: summary.priceDivergences, label: 'produtos com preços diferentes entre canais', filter: 'precos-divergentes' },
  ].filter((item) => item.count > 0) as CatalogAction[]
}
