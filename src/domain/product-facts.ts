import type { Product } from './product'
import { formatProductDescription } from './product-description'
import { findProductScale } from './product-scale'

/**
 * Ficha técnica do produto: fatos objetivos extraídos do que o anúncio já afirma.
 *
 * Nada aqui é inventado. Cada item sai de um campo real — atributos do produto, a
 * escala declarada, o que o próprio título do anúncio diz, ou uma seção estruturada
 * da descrição. Quando não há fato, o grupo simplesmente não existe: a página nunca
 * deve renderizar "Não informado" nem linha vazia.
 *
 * A leitura da descrição reaproveita `formatProductDescription` de propósito, para
 * existir um único vocabulário de cabeçalhos de marketplace no projeto.
 */
export type ProductFactGroup = { heading: string; items: string[] }

/** Ordem de exibição na ficha técnica. Grupos sem item são descartados. */
const GROUP_ORDER = ['Especificações', 'Compatibilidade', 'Indicado para', 'Conteúdo da embalagem'] as const

/** Cabeçalhos que `formatProductDescription` produz, mapeados nos quatro grupos da ficha. */
const HEADING_GROUP = new Map<string, (typeof GROUP_ORDER)[number]>([
  ['Especificações', 'Especificações'],
  ['Características', 'Especificações'],
  ['Detalhes', 'Especificações'],
  ['Material', 'Especificações'],
  ['Materiais', 'Especificações'],
  ['Compatibilidade', 'Compatibilidade'],
  ['Indicado para', 'Indicado para'],
  ['Conteúdo da embalagem', 'Conteúdo da embalagem'],
  ['Conteúdo do kit', 'Conteúdo da embalagem'],
  ['O que acompanha', 'Conteúdo da embalagem'],
  ['O kit contém', 'Conteúdo da embalagem'],
])

/** Sistemas citados no título do anúncio. É a compatibilidade que o próprio vendedor declara. */
const SYSTEM_PATTERNS: Array<[RegExp, string]> = [
  [/d\s*&\s*d|dungeons/i, 'D&D'],
  [/pathfinder/i, 'Pathfinder'],
  [/wargame/i, 'Wargame'],
]

/** Quantidade de peças anunciada: "Kit 5 Miniaturas", "Kit 12", "12 Miniaturas". */
function pieceCount(title: string): string | null {
  const kit = title.match(/\bkit\s+(\d{1,2})\b/i)?.[1]
  const pieces = title.match(/\b(\d{1,2})\s*miniaturas?\b/i)?.[1]
  const count = kit || pieces
  return count ? `${count} peças no kit` : null
}

/** Condição de pintura declarada no título. Só reporta o que está escrito. */
function paintState(title: string): string | null {
  if (/sem\s+pintura/i.test(title)) return 'Enviada sem pintura'
  if (/\bpintad[ao]\b/i.test(title)) return 'Enviada pintada'
  return null
}

/** Itens estruturados da descrição, agrupados pelo cabeçalho que os antecede. */
function factsFromDescription(description: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  let current: (typeof GROUP_ORDER)[number] | null = null
  for (const block of formatProductDescription(description)) {
    if (block.type === 'heading') {
      current = HEADING_GROUP.get(block.text) ?? null
      continue
    }
    if (!current) continue
    const items = block.type === 'paragraph' ? [block.text] : block.items
    grouped.set(current, [...(grouped.get(current) || []), ...items])
  }
  return grouped
}

export function productFacts(product: Pick<Product, 'title' | 'attributes' | 'description'> & { storefrontTitle?: string; storefrontDescription?: string }): ProductFactGroup[] {
  const title = product.storefrontTitle || product.title
  const grouped = factsFromDescription(product.storefrontDescription || product.description)
  const push = (group: (typeof GROUP_ORDER)[number], item: string) => grouped.set(group, [...(grouped.get(group) || []), item])

  // `Marketplace` já aparece nos chips da página; repetir na ficha não acrescenta fato.
  for (const [key, value] of Object.entries(product.attributes)) {
    if (key !== 'Marketplace' && value.trim()) push('Especificações', `${key}: ${value.trim()}`)
  }
  const scale = findProductScale(product.attributes, title)
  if (scale) push('Especificações', `Escala: ${scale}`)
  const pieces = pieceCount(title)
  if (pieces) push('Especificações', pieces)
  const paint = paintState(title)
  if (paint) push('Especificações', paint)
  const systems = SYSTEM_PATTERNS.filter(([pattern]) => pattern.test(title)).map(([, label]) => label)
  if (systems.length) push('Compatibilidade', systems.join(', '))

  return GROUP_ORDER.map((heading) => ({ heading, items: dedupe(grouped.get(heading) || []) })).filter((group) => group.items.length > 0)
}

const dedupe = (items: string[]) => {
  const seen = new Set<string>()
  return items.map((item) => item.trim()).filter((item) => item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()))
}
