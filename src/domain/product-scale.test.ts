import { describe, expect, it } from 'vitest'
import { findProductScale } from './product-scale'

describe('findProductScale', () => {
  it('prefers a scale attribute over the title', () => {
    expect(findProductScale({ Escala: '75 mm' }, 'Miniatura 32mm')).toBe('75 mm')
  })

  it('extracts a millimeter scale from the product title', () => {
    expect(findProductScale({}, 'Kit miniaturas RPG 32mm em resina')).toBe('32 mm')
  })

  it('does not invent a scale when synchronized data has none', () => {
    expect(findProductScale({}, 'Dragão para colecionadores')).toBeNull()
  })
})
