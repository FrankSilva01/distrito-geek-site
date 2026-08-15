import { describe, expect, it } from 'vitest'
import type { Product } from '../domain/product'
import type { Opportunity } from '../domain/opportunity'
import { classifyCatalogSearches } from './catalog-search-opportunities'

const product = (title: string, overrides: Partial<Product> = {}): Product => ({ id: title, slug: title.toLowerCase().replace(/\s/g, '-'), title, description: 'Descrição completa do produto real.', price: 50, currency: 'BRL', stock: 2, status: 'published', category: 'miniaturas-rpg', images: ['/x.webp'], attributes: {}, featured: false, showOnStorefront: true, listings: [{ marketplace: 'mercado-livre', externalId: title, url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }], version: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...overrides })
const radar = (name: string): Opportunity => ({ id: name, name, category: 'miniaturas-rpg', type: 'miniatura', format: 'indefinido', status: 'ideia', channels: [], potentialGuide: false, sessions: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })
const signal = (term: string) => ({ normalizedTerm: term, variants: [term], searches: 3, users: 2, sessions: 2, lastOccurredAt: '2026-08-15T18:45:00.000Z' })

describe('catalog search opportunities', () => {
  it('recalcula o atendimento com o catálogo atual', () => {
    expect(classifyCatalogSearches([signal('orcs')], [product('Kit 4 Miniaturas Orcs RPG')], [], 'ok')[0].classification).toBe('RESOLVIDO')
  })
  it('distingue produto oculto, Radar e ausência segura', () => {
    expect(classifyCatalogSearches([signal('necromante')], [product('Miniatura Necromante RPG', { showOnStorefront: false })], [], 'ok')[0].classification).toBe('PRODUTO OCULTO')
    expect(classifyCatalogSearches([signal('dragao vermelho')], [], [radar('Dragão Vermelho')], 'ok')[0].classification).toBe('OPORTUNIDADE NO RADAR')
    expect(classifyCatalogSearches([signal('miniatura beholder rpg')], [], [], 'ok')[0].classification).toBe('SEM PRODUTO')
  })
  it('prefere inconclusivo quando a associação é ambígua ou o Radar falhou', () => {
    expect(classifyCatalogSearches([signal('orc')], [product('Orc Guerreiro', { showOnStorefront: false }), product('Orc Xamã', { showOnStorefront: false })], [], 'ok')[0].classification).toBe('INCONCLUSIVO')
    expect(classifyCatalogSearches([signal('beholder')], [], [], 'error')[0].classification).toBe('INCONCLUSIVO')
  })
})
