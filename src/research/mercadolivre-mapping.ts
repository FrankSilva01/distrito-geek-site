import type { EvidenceDraft } from './market-research'
import { normalizeEvidence } from './market-research'

/**
 * Mapeamento PURO de um item do search do Mercado Livre → EvidenceDraft. Sem rede, sem segredo.
 * Regras da rodada (ver docs/provider-mercado-livre.md):
 * - `sold_quantity` é SINAL REFERENCIAL (aproximado), nunca número exato garantido; entra como
 *   número + `note` explicando. Ausente → `unknown` (jamais 0).
 * - reviews/quantidade/escala/material só quando houver ATRIBUTO ESTRUTURADO confiável; senão
 *   `unknown`. Nada de heurística agressiva sobre o título.
 * - O provider NÃO decide comparabilidade: todo resultado entra como 'parcial' (parcialmente
 *   comparável) e exige revisão humana antes de contar no preço (o motor só conta 'comparavel').
 */

export type MlAttribute = { id?: string; name?: string; value_name?: string | null }
export type MlSearchItem = {
  id?: string
  title?: string
  permalink?: string
  price?: number
  thumbnail?: string
  sold_quantity?: number
  available_quantity?: number
  condition?: string
  category_id?: string
  seller?: { id?: number; nickname?: string }
  attributes?: MlAttribute[]
}

export type MlResult = {
  externalId: string
  imageUrl?: string
  sellerLabel?: string
  categoryLabel?: string
  condition?: string
  draft: EvidenceDraft
}

export const SOLD_REFERENTIAL_NOTE = 'Quantidade vendida informada pelo Mercado Livre como referência aproximada.'

/** Atributo estruturado por lista de ids possíveis; devolve o texto só se presente e não vazio. */
function structuredAttr(item: MlSearchItem, ids: string[]): string | undefined {
  const found = item.attributes?.find((attribute) => attribute.id && ids.includes(attribute.id) && attribute.value_name)
  return found?.value_name?.trim() || undefined
}

/** Quantidade só de atributo estruturado numérico (inteiro). Caso contrário: undefined → unknown. */
function structuredQuantity(item: MlSearchItem): number | undefined {
  const raw = structuredAttr(item, ['UNITS_PER_PACKAGE', 'ITEMS_PER_PACK', 'PACKAGE_UNITS', 'KIT_UNITS', 'UNITS'])
  if (!raw) return undefined
  const value = Number.parseInt(raw.replace(/\D+/g, ''), 10)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export function mlItemToResult(item: MlSearchItem, capturedAt: string): MlResult {
  const soldKnown = typeof item.sold_quantity === 'number' && Number.isFinite(item.sold_quantity)
  const sellerLabel = item.seller?.nickname || (item.seller?.id ? `seller ${item.seller.id}` : undefined)
  const noteParts = [
    soldKnown ? SOLD_REFERENTIAL_NOTE : null,
    item.id ? `ID ML: ${item.id}` : null,
    sellerLabel ? `Vendedor: ${sellerLabel}` : null,
    item.category_id ? `Categoria ML: ${item.category_id}` : null,
  ].filter(Boolean)
  const draft = normalizeEvidence({
    url: item.permalink,
    title: item.title,
    price: item.price,
    // Só atributo estruturado vira verdade; título NÃO é inferido automaticamente.
    kitQuantity: structuredQuantity(item),
    sold: soldKnown ? item.sold_quantity : undefined, // ausente → unknown, nunca 0
    reviews: undefined, // o search do ML não retorna avaliações → unknown (sem N+1 por item)
    scale: structuredAttr(item, ['SCALE', 'ESCALA']),
    material: structuredAttr(item, ['MATERIAL', 'MATERIALS']),
    note: noteParts.join(' · ') || undefined,
  }, 'mercado-livre', capturedAt)
  return {
    externalId: item.id || item.permalink || '',
    imageUrl: item.thumbnail || undefined,
    sellerLabel,
    categoryLabel: item.category_id || undefined,
    condition: item.condition || undefined,
    // Provider não decide COMPARÁVEL: entra conservador, revisão humana promove depois.
    draft: { ...draft, comparability: 'parcial' },
  }
}

/** Mapeia a lista e deduplica DENTRO do lote por externalId (source+id). Ordem preservada. */
export function mlItemsToResults(items: MlSearchItem[], capturedAt: string): MlResult[] {
  const seen = new Set<string>()
  const results: MlResult[] = []
  for (const item of items) {
    const result = mlItemToResult(item, capturedAt)
    const key = result.externalId || result.draft.url
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    results.push(result)
  }
  return results
}
