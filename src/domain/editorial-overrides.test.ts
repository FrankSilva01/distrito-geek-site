import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * `scripts/seo-overrides.json` é copy editorial escrita à mão e aplicada em produção por
 * `scripts/aplicar-seo.mjs`. Nada em runtime valida esse arquivo: um texto errado é gravado
 * nos Blobs em silêncio e só aparece na página. Estes testes são a única rede.
 */
describe('overrides editoriais', () => {
  type Override = {
    storefrontTitle?: string
    seoTitle?: string
    seoDescription?: string
    storefrontDescription?: string
    showOnStorefront?: boolean
    _motivo?: string
  }
  const arquivo = JSON.parse(readFileSync('scripts/seo-overrides.json', 'utf8')) as Record<string, Override>
  const entradas = Object.entries(arquivo).filter(([id]) => id !== '_leia')
  const CAMPOS = ['storefrontTitle', 'seoTitle', 'seoDescription', 'storefrontDescription'] as const

  // O preço muda no Mercado Livre sem passar por aqui. Preço escrito na copy vira mentira
  // silenciosa no dia do primeiro reajuste, e no Mercado Livre chega a derrubar o anúncio.
  // O número tem de vir do dado comercial, que a página já renderiza.
  it('não carrega preço na copy: o valor vem do dado comercial, não do texto', () => {
    for (const [id, override] of entradas) {
      for (const campo of CAMPOS) {
        const texto = override[campo]
        if (typeof texto !== 'string') continue
        expect(texto, `${id} → ${campo} tem valor em reais na copy`).not.toMatch(/R\$/)
        expect(texto, `${id} → ${campo} calcula preço por unidade na copy`).not.toMatch(/^Sai a /m)
      }
    }
  })

  it('descreve o produto sem prometer preço, parcelamento ou frete', () => {
    for (const [id, override] of entradas) {
      const texto = [override.seoDescription, override.storefrontDescription].filter(Boolean).join('\n')
      expect(texto, `${id} promete condição comercial que a copy não controla`).not.toMatch(/\bfrete grátis\b|\bsem juros\b|\bà vista\b/i)
    }
  })

  // MLB4883900951 / DG-MIN-000038, "Miniatura De Orcs": anúncio finalizado no Mercado Livre.
  // O preço de R$ 764,10 e a descrição de 17 caracteres vêm assim do FlowOps e não existe
  // descrição melhor para copiar em lugar nenhum — inventar copy só para o produto passar em
  // `canPublishProduct` seria publicar texto que ninguém escreveu sobre um anúncio que acabou.
  it('mantém o orc de anúncio finalizado fora da vitrine, e sem copy inventada', () => {
    const orc = arquivo.MLB4883900951
    expect(orc, 'a decisão sobre o anúncio finalizado sumiu do arquivo').toBeDefined()
    expect(orc.showOnStorefront).toBe(false)
    expect(orc._motivo, 'ocultar produto exige motivo registrado').toMatch(/finalizado/i)
    for (const campo of CAMPOS) {
      expect(orc[campo], `${campo} não pode ganhar texto inventado para forçar publicação`).toBeUndefined()
    }
  })

  it('só oculta produto com motivo escrito', () => {
    for (const [id, override] of entradas) {
      if (override.showOnStorefront !== false) continue
      expect(override._motivo, `${id} é ocultado sem motivo registrado`).toBeTruthy()
    }
  })

  it('respeita o limite de meta description que o próprio script avisa', () => {
    for (const [id, override] of entradas) {
      if (typeof override.seoDescription !== 'string') continue
      expect(override.seoDescription.length, `${id} tem meta description longa demais`).toBeLessThanOrEqual(165)
    }
  })
})
