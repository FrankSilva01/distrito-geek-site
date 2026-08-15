import type { SearchSignal } from '../../netlify/functions/_shared/google-analytics'
import type { Opportunity } from '../domain/opportunity'
import type { Product } from '../domain/product'
import { filterAndSortProducts, normalizeCatalogIntent } from '../domain/catalog-filters'
import { displayTitle, isPublicProduct } from '../domain/storefront-presentation'

export type SearchClassification = 'SEM PRODUTO' | 'PRODUTO OCULTO' | 'BUSCA NÃO ENCONTROU' | 'OPORTUNIDADE NO RADAR' | 'RESOLVIDO' | 'INCONCLUSIVO'
export type ClassifiedSearch = SearchSignal & { classification: SearchClassification; product?: Product; opportunity?: Opportunity; reason: string }

const productText = (product: Product) => normalizeCatalogIntent(`${displayTitle(product)} ${product.marketplaceTitle || ''} ${product.category} ${Object.values(product.attributes).join(' ')}`)
const safelyMatches = (needle: string, haystack: string) => {
  const terms = normalizeCatalogIntent(needle).split(' ').filter(Boolean), words = new Set(normalizeCatalogIntent(haystack).split(' ').filter(Boolean))
  return terms.length > 0 && terms.every((term) => words.has(term))
}

export function classifyCatalogSearches(signals: SearchSignal[], products: Product[], opportunities: Opportunity[], radarState: 'ok' | 'error'): ClassifiedSearch[] {
  return signals.map((signal) => {
    const currentResults = filterAndSortProducts(products, { query: signal.normalizedTerm, category: 'todos', priceRange: 'all', sort: 'recentes' })
    if (currentResults.length === 1) return { ...signal, classification: 'RESOLVIDO', product: currentResults[0], reason: 'A busca encontra um produto público no catálogo atual.' }
    if (currentResults.length > 1) return { ...signal, classification: 'RESOLVIDO', reason: `A busca encontra ${currentResults.length} produtos públicos no catálogo atual.` }

    const semanticProducts = products.filter((product) => safelyMatches(signal.normalizedTerm, productText(product)))
    if (semanticProducts.length > 1) return { ...signal, classification: 'INCONCLUSIVO', reason: 'Há mais de uma associação possível no catálogo; requer revisão manual.' }
    if (semanticProducts.length === 1) {
      const product = semanticProducts[0]
      if (!isPublicProduct(product)) return { ...signal, classification: 'PRODUTO OCULTO', product, reason: 'Existe correspondência segura, mas o produto não está público hoje.' }
      return { ...signal, classification: 'BUSCA NÃO ENCONTROU', product, reason: 'Existe produto público correspondente, mas a busca atual não o retorna.' }
    }

    if (radarState === 'error') return { ...signal, classification: 'INCONCLUSIVO', reason: 'Não há correspondência segura no catálogo e o Radar não pôde ser validado.' }
    const radarMatches = opportunities.filter((item) => safelyMatches(signal.normalizedTerm, `${item.name} ${item.category}`) || safelyMatches(item.name, signal.normalizedTerm))
    if (radarMatches.length === 1) return { ...signal, classification: 'OPORTUNIDADE NO RADAR', opportunity: radarMatches[0], reason: 'Há uma correspondência segura no Radar existente.' }
    if (radarMatches.length > 1) return { ...signal, classification: 'INCONCLUSIVO', reason: 'Há mais de uma oportunidade possível no Radar; requer revisão manual.' }
    return { ...signal, classification: 'SEM PRODUTO', reason: 'Nenhum produto atual ou oportunidade segura no Radar atende ao termo.' }
  })
}
