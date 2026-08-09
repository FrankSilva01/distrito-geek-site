import { describe, expect, it } from 'vitest'
import { normalizeMarketplaceRow } from './normalize-row'

describe('marketplace spreadsheet normalization', () => {
  it('normalizes Brazilian prices and Mercado Livre identifiers', () => {
    const result = normalizeMarketplaceRow({
      Título: 'Miniatura Mago RPG 32mm Resina', Preço: '99,90', Marketplace: 'Mercado Livre',
      'ID Externo': 'MLB4883770099', Status: 'Ativo', Estoque: '4',
    }, 2)
    expect(result.errors).toEqual([])
    expect(result.product?.price).toBe(99.9)
    expect(result.product?.stock).toBe(4)
    expect(result.product?.listings[0].marketplace).toBe('mercado-livre')
    expect(result.product?.status).toBe('draft')
  })

  it('ignores QA records', () => {
    expect(normalizeMarketplaceRow({ Título: 'Qa Codex UI', Status: 'Ativo' }, 3).ignored).toBe(true)
  })

  it('preserves paused records without publishing them', () => {
    const result = normalizeMarketplaceRow({ Título: 'Deadpool artesanal', Preço: '49,90', Marketplace: 'Mercado Livre', 'ID Externo': 'MLB1', Status: 'Pausado' }, 4)
    expect(result.product?.status).toBe('paused')
  })
})
