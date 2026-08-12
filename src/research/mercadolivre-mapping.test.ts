import { describe, expect, it } from 'vitest'
import { SOLD_REFERENTIAL_NOTE, mlItemToResult, mlItemsToResults, type MlSearchItem } from './mercadolivre-mapping'
import { opportunitySchema } from '../domain/opportunity'

const AT = '2026-08-12T10:00:00.000Z'
const item = (over: Partial<MlSearchItem> = {}): MlSearchItem => ({
  id: 'MLB123', title: 'Kit 6 Miniaturas Goblin RPG 32mm', permalink: 'https://produto.mercadolivre.com.br/MLB-123',
  price: 79.9, thumbnail: 'https://http2.mlstatic.com/x.jpg', sold_quantity: 50, available_quantity: 5,
  condition: 'new', category_id: 'MLB1234', seller: { id: 987, nickname: 'LojaRPG' }, attributes: [], ...over,
})

describe('mapeamento ML → EvidenceDraft', () => {
  it('mapeia campos básicos e marca comparabilidade como parcial (revisão humana)', () => {
    const result = mlItemToResult(item(), AT)
    expect(result.externalId).toBe('MLB123')
    expect(result.imageUrl).toBe('https://http2.mlstatic.com/x.jpg')
    expect(result.sellerLabel).toBe('LojaRPG')
    expect(result.categoryLabel).toBe('MLB1234')
    expect(result.draft.url).toBe('https://produto.mercadolivre.com.br/MLB-123')
    expect(result.draft.title).toBe('Kit 6 Miniaturas Goblin RPG 32mm')
    expect(result.draft.price).toBe(79.9)
    expect(result.draft.source).toBe('mercado-livre')
    expect(result.draft.comparability).toBe('parcial')
    expect(result.draft.collectedAt).toBe(AT)
  })

  it('sold conhecido entra como número COM note referencial', () => {
    const result = mlItemToResult(item({ sold_quantity: 120 }), AT)
    expect(result.draft.sold).toBe(120)
    expect(result.draft.note).toContain(SOLD_REFERENTIAL_NOTE)
  })

  it('REGRESSÃO: sold_quantity ausente vira unknown, NUNCA 0', () => {
    const result = mlItemToResult(item({ sold_quantity: undefined }), AT)
    expect(result.draft.sold).toBe('unknown')
    expect(result.draft.note ?? '').not.toContain(SOLD_REFERENTIAL_NOTE)
  })

  it('avaliações ausentes no search → unknown (sem N+1 por item)', () => {
    expect(mlItemToResult(item(), AT).draft.reviews).toBe('unknown')
  })

  it('quantidade/escala/material só de atributo estruturado; título não é inferido', () => {
    const semAtributo = mlItemToResult(item({ title: 'Kit 6 Goblins 32mm resina' }), AT)
    expect(semAtributo.draft.kitQuantity).toBe('unknown') // "6" no título NÃO vira quantidade
    expect(semAtributo.draft.scale).toBeUndefined()
    expect(semAtributo.draft.material).toBeUndefined()

    const comAtributo = mlItemToResult(item({
      attributes: [
        { id: 'UNITS_PER_PACKAGE', name: 'Unidades', value_name: '6' },
        { id: 'MATERIAL', name: 'Material', value_name: 'Resina' },
        { id: 'SCALE', name: 'Escala', value_name: '32mm' },
      ],
    }), AT)
    expect(comAtributo.draft.kitQuantity).toBe(6)
    expect(comAtributo.draft.material).toBe('Resina')
    expect(comAtributo.draft.scale).toBe('32mm')
  })

  it('preço ausente → unknown (nunca 0)', () => {
    expect(mlItemToResult(item({ price: undefined }), AT).draft.price).toBe('unknown')
  })

  it('deduplica dentro do lote por externalId, preservando ordem', () => {
    const results = mlItemsToResults([item({ id: 'A' }), item({ id: 'B' }), item({ id: 'A' })], AT)
    expect(results.map((result) => result.externalId)).toEqual(['A', 'B'])
  })

  it('o draft mapeado é aceito pelo schema de Evidence ao receber id', () => {
    const result = mlItemToResult(item(), AT)
    const opportunity = opportunitySchema.parse({
      id: 'op1', name: 'X', createdAt: AT, updatedAt: AT,
      sessions: [{ id: 's1', date: '2026-08-12', terms: ['goblin'], sources: ['mercado-livre'], evidences: [{ ...result.draft, id: 'e1' }] }],
    })
    expect(opportunity.sessions[0].evidences[0].comparability).toBe('parcial')
  })
})
