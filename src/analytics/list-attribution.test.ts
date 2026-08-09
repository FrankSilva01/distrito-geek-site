import { beforeEach, describe, expect, it } from 'vitest'
import { resetConsent, setConsent } from './events'
import { clearListOrigins, readListOrigin, rememberListOrigin } from './list-attribution'

describe('atribuição de lista para CTR externo', () => {
  beforeEach(() => { clearListOrigins(); resetConsent() })

  it('não guarda a origem enquanto não houver consentimento', () => {
    expect(rememberListOrigin('mlb-1', { list_name: 'catalogo', position: 3 })).toBe(false)
    expect(readListOrigin('mlb-1')).toBeNull()
  })

  it('guarda lista e posição depois do consentimento', () => {
    setConsent('granted')
    expect(rememberListOrigin('mlb-1', { list_name: 'catalogo', position: 3 })).toBe(true)
    expect(readListOrigin('mlb-1')).toEqual({ list_name: 'catalogo', position: 3 })
  })

  it('mantém apenas a origem mais recente de cada produto', () => {
    setConsent('granted')
    rememberListOrigin('mlb-1', { list_name: 'home-destaques', position: 1 })
    rememberListOrigin('mlb-1', { list_name: 'catalogo', position: 7 })
    expect(readListOrigin('mlb-1')).toEqual({ list_name: 'catalogo', position: 7 })
  })

  it('rejeita origem inválida e limita o histórico guardado', () => {
    setConsent('granted')
    expect(rememberListOrigin('mlb-1', { list_name: 'catalogo', position: 0 })).toBe(false)
    expect(rememberListOrigin('mlb-2', { list_name: '', position: 2 })).toBe(false)
    for (let index = 1; index <= 25; index += 1) rememberListOrigin(`p-${index}`, { list_name: 'catalogo', position: index })
    expect(readListOrigin('p-1')).toBeNull()
    expect(readListOrigin('p-25')).toEqual({ list_name: 'catalogo', position: 25 })
  })
})
