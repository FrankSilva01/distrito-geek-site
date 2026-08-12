import { GUIDE_INDEX, guideMatchText, type GuideSummary } from '../content/guides-index'
import type { Product } from '../domain/product'
import { isPublicProduct } from '../domain/storefront-presentation'
import { assessSession, latestSession, type Assessment, type FitContext, type Heat, type Opportunity } from '../domain/opportunity'

/** Categorias/temas que caracterizam o foco RPG atual — sinal objetivo de aderência, sem IA. */
const RPG_FOCUS = /rpg|miniatura|dnd|d&d|pathfinder|acessorio|acessório|cenario|cenário|token|dado|colecion/i

/**
 * CONTEÚDO SEM PRODUTO (Parte 38): guias que não encontram produto específico/relevante.
 * Um guia entra na lista quando não tem palavra-chave de produto OU quando nenhuma delas casa
 * um produto público do catálogo. Usa só o índice leve — nunca importa a prosa dos guias.
 */
export function guidesWithoutProduct(products: Product[]): GuideSummary[] {
  const haystacks = products.filter(isPublicProduct).map(guideMatchText)
  return GUIDE_INDEX.filter((guide) =>
    !guide.productKeywords.length ||
    !guide.productKeywords.some((keyword) => haystacks.some((text) => text.includes(keyword.toLowerCase()))),
  )
}

/** Sinais internos objetivos para a aderência Distrito Geek (dgFit). */
export function fitContextFor(opportunity: Pick<Opportunity, 'name' | 'category' | 'guideSlug'>, products: Product[]): FitContext {
  const categories = new Set(products.map((product) => product.category))
  const name = `${opportunity.name} ${opportunity.category}`.toLowerCase()
  return {
    categoryExists: Boolean(opportunity.category) && categories.has(opportunity.category),
    guideExists: Boolean(opportunity.guideSlug) || GUIDE_INDEX.some((guide) => guide.productKeywords.some((keyword) => name.includes(keyword.toLowerCase()))),
    complementaryProduct: Boolean(opportunity.category) && products.some((product) => product.category === opportunity.category),
    rpgFocus: RPG_FOCUS.test(opportunity.category) || RPG_FOCUS.test(name),
  }
}

/** Avaliação atual (última sessão). Sempre devolve um resultado explicável, mesmo sem evidências. */
export function assessOpportunity(opportunity: Opportunity, products: Product[]): Assessment {
  const session = latestSession(opportunity)
  return assessSession(session?.evidences ?? [], fitContextFor(opportunity, products), { min: opportunity.targetPriceMin, max: opportunity.targetPriceMax })
}

export function radarCategories(list: Opportunity[]): string[] {
  return [...new Set(list.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export type RadarEntry = { opportunity: Opportunity; assessment: Assessment }
export type RadarFilters = { heat: 'todos' | Heat; status: 'todos' | Opportunity['status']; category: 'todas' | string; channel: 'todos' | 'sem-canal' | Opportunity['channels'][number]; query: string }
export const emptyRadarFilters: RadarFilters = { heat: 'todos', status: 'todos', category: 'todas', channel: 'todos', query: '' }

export function filterOpportunities(entries: RadarEntry[], filters: RadarFilters): RadarEntry[] {
  const query = filters.query.trim().toLowerCase()
  return entries.filter(({ opportunity, assessment }) => {
    if (filters.heat !== 'todos' && assessment.heat !== filters.heat) return false
    if (filters.status !== 'todos' && opportunity.status !== filters.status) return false
    if (filters.category !== 'todas' && opportunity.category !== filters.category) return false
    if (filters.channel === 'sem-canal' && opportunity.channels.length) return false
    if (filters.channel !== 'todos' && filters.channel !== 'sem-canal' && !opportunity.channels.includes(filters.channel)) return false
    if (query) {
      const terms = latestSession(opportunity)?.terms.join(' ') ?? ''
      const haystack = `${opportunity.name} ${opportunity.category} ${opportunity.notes ?? ''} ${terms}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}
