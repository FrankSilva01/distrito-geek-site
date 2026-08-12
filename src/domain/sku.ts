import type { Product } from './product'

/**
 * SKU próprio e permanente da Distrito Geek: `DG-<PREFIXO>-<sequência de 6 dígitos>`
 * (ex.: `DG-MIN-000001`). Independe do marketplace e nunca é regenerado.
 *
 * Permanência garantida por um REGISTRO keyed pelo id interno do produto (`Record<id, sku>`),
 * persistido à parte (como os overrides editoriais). Na sincronização/importação, produto novo
 * ganha SKU uma única vez; produto já registrado mantém o mesmo SKU mesmo que título, preço,
 * descrição ou categoria mudem. O prefixo é congelado no momento da geração — trocar a
 * categoria depois não altera o SKU já emitido.
 */
export type SkuRegistry = Record<string, string>

/** Prefixo de 3 letras derivado da categoria (primeira palavra, sem acento). Determinístico. */
export function skuPrefixForCategory(category: string): string {
  const firstWord = category.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-zA-Z0-9]+/).filter(Boolean)[0] || ''
  const letters = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3)
  return letters ? letters.padEnd(3, 'X') : 'DGX'
}

const SKU_PATTERN = /^DG-[A-Z]{2,4}-(\d{6})$/
export const formatSku = (prefix: string, sequence: number) => `DG-${prefix}-${String(sequence).padStart(6, '0')}`
export const isSku = (value: string) => SKU_PATTERN.test(value)

/** Maior sequência já usada em qualquer SKU do registro (0 se vazio). O contador é global. */
export function highestSkuSequence(registry: SkuRegistry): number {
  return Object.values(registry).reduce((max, sku) => {
    const sequence = Number(sku.match(SKU_PATTERN)?.[1] ?? 0)
    return sequence > max ? sequence : max
  }, 0)
}

/**
 * Atribui SKU aos produtos que ainda não têm um no registro, preservando os existentes e sem
 * colisão (sequência global crescente). Função pura: devolve o registro atualizado e os produtos
 * com o campo `sku` aplicado a partir do registro. Não regenera SKU de id já registrado.
 */
export function assignSkus(products: Product[], registry: SkuRegistry): { registry: SkuRegistry; products: Product[] } {
  const next = { ...registry }
  let sequence = highestSkuSequence(next)
  for (const product of products) {
    if (!next[product.id]) next[product.id] = formatSku(skuPrefixForCategory(product.category), ++sequence)
  }
  const withSku = products.map((product) => (product.sku === next[product.id] ? product : { ...product, sku: next[product.id] }))
  return { registry: next, products: withSku }
}
