import type { Product } from './product'
import { displayTitle, isPublicProduct } from './storefront-presentation'

export type CatalogSort = 'recentes' | 'menor-preco' | 'maior-preco' | 'az'
export type PriceRangeId = 'all' | 'under-50' | '50-100' | '100-200' | '200-400' | 'over-400'
export type PriceRange = { id: Exclude<PriceRangeId, 'all'>; label: string; accepts: (price: number) => boolean }

const definitions: PriceRange[] = [
  { id: 'under-50', label: 'Até R$ 50', accepts: (price) => price <= 50 },
  { id: '50-100', label: 'R$ 50–100', accepts: (price) => price > 50 && price <= 100 },
  { id: '100-200', label: 'R$ 100–200', accepts: (price) => price > 100 && price <= 200 },
  { id: '200-400', label: 'R$ 200–400', accepts: (price) => price > 200 && price <= 400 },
  { id: 'over-400', label: 'Acima de R$ 400', accepts: (price) => price > 400 },
]

export function priceRanges(products: Product[]): PriceRange[] {
  const publicProducts = products.filter(isPublicProduct)
  return definitions.filter((range) => publicProducts.some((product) => range.accepts(product.price)))
}

export function filterAndSortProducts(products: Product[], options: { query: string; category: string; priceRange: PriceRangeId; sort: CatalogSort }): Product[] {
  const query = options.query.trim().toLocaleLowerCase('pt-BR')
  const range = definitions.find((candidate) => candidate.id === options.priceRange)
  return products.filter((product) => {
    const searchable = `${displayTitle(product)} ${product.marketplaceTitle || ''} ${product.category}`.toLocaleLowerCase('pt-BR')
    return isPublicProduct(product) &&
      (options.category === 'todos' || product.category === options.category) &&
      (!query || searchable.includes(query)) &&
      (!range || range.accepts(product.price))
  }).sort((a, b) => options.sort === 'menor-preco' ? a.price - b.price
    : options.sort === 'maior-preco' ? b.price - a.price
      : options.sort === 'az' ? displayTitle(a).localeCompare(displayTitle(b), 'pt-BR')
        : b.updatedAt.localeCompare(a.updatedAt))
}
