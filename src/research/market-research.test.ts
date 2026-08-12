import { describe, expect, it } from 'vitest'
import { opportunitySchema } from '../domain/opportunity'
import {
  NotImplementedError, PROVIDERS, mercadoLivreProvider, normalizeEvidence, shopeeAffiliateProvider, toUnknownNumber, unknownFieldCount,
} from './market-research'

describe('normalização de evidência (UNKNOWN ≠ zero)', () => {
  it('coage só número finito real; ausência vira unknown', () => {
    expect(toUnknownNumber(0)).toBe(0)
    expect(toUnknownNumber(19.9)).toBe(19.9)
    expect(toUnknownNumber(undefined)).toBe('unknown')
    expect(toUnknownNumber(null)).toBe('unknown')
    expect(toUnknownNumber(Number.NaN)).toBe('unknown')
    expect(toUnknownNumber('12')).toBe('unknown')
  })

  it('campos ausentes no registro cru viram unknown, nunca 0', () => {
    const draft = normalizeEvidence({ url: 'https://x', title: 'Kit', price: 79.9 }, 'mercado-livre', '2026-08-12')
    expect(draft.price).toBe(79.9)
    expect(draft.sold).toBe('unknown')
    expect(draft.reviews).toBe('unknown')
    expect(draft.kitQuantity).toBe('unknown')
    expect(draft.comparability).toBe('comparavel')
    expect(unknownFieldCount(draft)).toBe(3)
  })

  it('produz um rascunho aceito pelo schema de Evidence ao receber um id', () => {
    const draft = normalizeEvidence({ url: 'https://x', title: 'Kit', price: 79.9, sold: 10, note: 'sold referencial' }, 'mercado-livre', '2026-08-12')
    const opportunity = opportunitySchema.parse({
      id: 'op1', name: 'Kit', createdAt: '2026-08-01', updatedAt: '2026-08-12',
      sessions: [{ id: 's1', date: '2026-08-12', evidences: [{ ...draft, id: 'e1' }] }],
    })
    expect(opportunity.sessions[0].evidences[0].price).toBe(79.9)
    expect(opportunity.sessions[0].evidences[0].note).toBe('sold referencial')
  })
})

describe('providers (andaime, sem rede)', () => {
  it('declaram capacidade coerente com a investigação', () => {
    expect(mercadoLivreProvider.availability).toBe('viable')
    expect(mercadoLivreProvider.capabilities.sold).toBe('referential')
    expect(shopeeAffiliateProvider.availability).toBe('needs-approval')
    expect(shopeeAffiliateProvider.capabilities.sold).toBe('exact')
    expect(PROVIDERS.map((provider) => provider.id)).toContain('manual')
  })

  it('providers automáticos ainda não conectam produção', async () => {
    await expect(mercadoLivreProvider.search({ term: 'kit moedas rpg' })).rejects.toBeInstanceOf(NotImplementedError)
    await expect(shopeeAffiliateProvider.search({ term: 'kit moedas rpg' })).rejects.toBeInstanceOf(NotImplementedError)
  })
})
