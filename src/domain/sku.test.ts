import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { assignSkus, formatSku, highestSkuSequence, isSku, skuPrefixForCategory } from './sku'

describe('SKU Distrito Geek', () => {
  const base = loadSeedCatalog()

  it('formata SKU DG-<PREFIXO>-<6 dígitos> e valida', () => {
    expect(formatSku('MIN', 1)).toBe('DG-MIN-000001')
    expect(formatSku('KIT', 42)).toBe('DG-KIT-000042')
    expect(isSku('DG-MIN-000001')).toBe(true)
    expect(isSku('MLB123')).toBe(false)
    expect(isSku('DG-min-000001')).toBe(false)
  })

  it('deriva prefixo estável da categoria, sem acento', () => {
    expect(skuPrefixForCategory('miniaturas-rpg')).toBe('MIN')
    expect(skuPrefixForCategory('utilidades-geek')).toBe('UTI')
    expect(skuPrefixForCategory('cenários')).toBe('CEN')
    expect(skuPrefixForCategory('')).toBe('DGX')
  })

  it('atribui SKU a todo produto sem um, sem colisão e com sequência global', () => {
    const { registry, products } = assignSkus(base, {})
    expect(products.every((product) => product.sku && isSku(product.sku))).toBe(true)
    const skus = products.map((product) => product.sku!)
    expect(new Set(skus).size, 'SKUs duplicados').toBe(skus.length)
    expect(Object.keys(registry).length).toBe(base.length)
    expect(highestSkuSequence(registry)).toBe(base.length)
  })

  it('mantém o SKU existente e NÃO regenera por mudança de título/categoria/preço', () => {
    const first = assignSkus(base, {})
    const target = first.products[0]
    const skuBefore = target.sku!
    // Simula ressincronização com dados mudados, reusando o mesmo registro:
    const mutated = first.products.map((product) =>
      product.id === target.id ? { ...product, title: 'Título Totalmente Novo', category: 'utilidades-geek', price: product.price + 10 } : product,
    )
    const second = assignSkus(mutated, first.registry)
    expect(second.products.find((product) => product.id === target.id)!.sku).toBe(skuBefore)
    // Registro não cresce quando nada é novo:
    expect(Object.keys(second.registry).length).toBe(Object.keys(first.registry).length)
  })

  it('gera SKU só para produto novo, preservando os já registrados (migração incremental)', () => {
    const existing = assignSkus(base.slice(0, 3), {})
    const grown = assignSkus(base, existing.registry)
    // Os 3 primeiros mantêm exatamente o mesmo SKU:
    for (const product of existing.products) {
      expect(grown.products.find((item) => item.id === product.id)!.sku).toBe(product.sku)
    }
    // Os novos receberam sequências acima da maior anterior:
    expect(highestSkuSequence(grown.registry)).toBe(base.length)
  })
})
