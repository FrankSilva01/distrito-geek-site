import { describe, expect, it } from 'vitest'
import type { Product } from '../domain/product'
import type { Opportunity } from '../domain/opportunity'
import { assessOpportunity, emptyRadarFilters, filterOpportunities, fitContextFor, guidesWithoutProduct, radarCategories, type RadarEntry } from './radar-helpers'

const product = (over: Partial<Product>): Product => ({
  id: 'p1', slug: 'kit-goblins', title: 'Kit Goblins RPG 32mm', description: 'goblins em resina para RPG de mesa',
  price: 89.9, currency: 'BRL', stock: 3, status: 'published', category: 'miniaturas-rpg', images: ['/a.png'],
  attributes: {}, featured: false, showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-01', updatedAt: '2026-08-01', ...over,
})

const opp = (over: Partial<Opportunity>): Opportunity => ({
  id: 'op1', name: 'Kit moedas RPG', category: 'acessorios-rpg', type: 'kit', format: 'kit',
  status: 'ideia', potentialGuide: false, channels: [], sessions: [], createdAt: '2026-08-01', updatedAt: '2026-08-01', ...over,
})

describe('guidesWithoutProduct (conteúdo sem produto)', () => {
  it('inclui guias sem palavra-chave e guias cujas keywords não casam nenhum produto', () => {
    const gaps = guidesWithoutProduct([product({ description: 'goblins em resina para mesas de RPG' })])
    const slugs = gaps.map((guide) => guide.slug)
    expect(slugs).toContain('tokens-rpg') // productKeywords vazio
    expect(slugs).toContain('vampiros-rpg') // keyword 'vampiro' não casa o catálogo
    expect(slugs).not.toContain('goblins-rpg') // 'goblin' casa o produto
  })

  it('some da lista quando um produto passa a casar a keyword', () => {
    const withVampire = guidesWithoutProduct([product({ id: 'v', title: 'Miniatura Vampiro 32mm', description: 'vampiro em resina para mesas de RPG' })])
    expect(withVampire.map((guide) => guide.slug)).not.toContain('vampiros-rpg')
  })
})

describe('fitContextFor (aderência)', () => {
  it('detecta categoria compatível, guia por keyword, complementar e foco RPG', () => {
    const products = [product({ category: 'acessorios-rpg' })]
    const context = fitContextFor(opp({ category: 'acessorios-rpg', name: 'tokens de rpg' }), products)
    expect(context.categoryExists).toBe(true)
    expect(context.complementaryProduct).toBe(true)
    expect(context.rpgFocus).toBe(true)
  })

  it('categoria inexistente no catálogo não conta', () => {
    const context = fitContextFor(opp({ category: 'categoria-inexistente', name: 'coisa qualquer' }), [product({})])
    expect(context.categoryExists).toBe(false)
    expect(context.complementaryProduct).toBe(false)
  })
})

describe('assessOpportunity', () => {
  it('devolve avaliação explicável mesmo sem evidências', () => {
    const assessment = assessOpportunity(opp({}), [product({})])
    expect(assessment.heat).toBe('inconclusivo')
    expect(assessment.reasons.length).toBeGreaterThan(0)
  })
})

describe('filtros do Radar', () => {
  const entries: RadarEntry[] = [
    { opportunity: opp({ id: 'a', name: 'Moedas', status: 'ideia', category: 'acessorios-rpg', channels: ['shopee'] }), assessment: assessOpportunity(opp({ id: 'a' }), []) },
    { opportunity: opp({ id: 'b', name: 'Dragão épico', status: 'aprovado', category: 'miniaturas-rpg', channels: [] }), assessment: assessOpportunity(opp({ id: 'b' }), []) },
  ]

  it('filtra por status', () => {
    expect(filterOpportunities(entries, { ...emptyRadarFilters, status: 'aprovado' }).map((entry) => entry.opportunity.id)).toEqual(['b'])
  })

  it('filtra por canal e por sem-canal', () => {
    expect(filterOpportunities(entries, { ...emptyRadarFilters, channel: 'shopee' }).map((entry) => entry.opportunity.id)).toEqual(['a'])
    expect(filterOpportunities(entries, { ...emptyRadarFilters, channel: 'sem-canal' }).map((entry) => entry.opportunity.id)).toEqual(['b'])
  })

  it('filtra por busca textual', () => {
    expect(filterOpportunities(entries, { ...emptyRadarFilters, query: 'dragão' }).map((entry) => entry.opportunity.id)).toEqual(['b'])
  })

  it('radarCategories lista categorias reais únicas e ordenadas', () => {
    expect(radarCategories(entries.map((entry) => entry.opportunity))).toEqual(['acessorios-rpg', 'miniaturas-rpg'])
  })
})
