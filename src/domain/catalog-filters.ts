import type { Product } from './product'
import { displayTitle, isPublicProduct } from './storefront-presentation'

export type CatalogSort = 'recentes' | 'menor-preco' | 'maior-preco' | 'az'
export type PriceRangeId = 'all' | 'under-50' | '50-100' | '100-200' | '200-400' | 'over-400'
export type PriceRange = { id: Exclude<PriceRangeId, 'all'>; label: string; accepts: (price: number) => boolean }

const definitions: PriceRange[] = [
  { id: 'under-50', label: 'Até R$ 50', accepts: (price) => price <= 50 },
  { id: '50-100', label: 'R$ 50–100', accepts: (price) => price > 50 && price <= 100 },
  { id: '100-200', label: 'R$ 100–200', accepts: (price) => price > 100 && price <= 200 },
  { id: '200-400', label: 'R$ 200–400', accepts: (price) => price > 200 && price <= 400 },
  { id: 'over-400', label: 'Acima de R$ 400', accepts: (price) => price > 400 },
]

// Termos-guarda-chuva: "criatura", "monstro" e "inimigo" não nomeiam uma peça, nomeiam a
// classe delas. Isso é diferente do caso esqueleto≠zumbi avisado abaixo — ali o erro seria
// tratar duas criaturas irmãs como sinônimo; aqui o comprador digitou o hiperônimo de
// propósito. A lista usa a forma já canonizada, que é como `searchable` chega ao match.
const CREATURE_TERMS = ['demonio', 'goblin', 'orc', 'esqueleto', 'ghoul', 'morto', 'vampiro', 'necromante', 'dragao', 'fenrir', 'bestial']
// Peças grandes, que é o que se procura por "boss" ou "chefe".
const BOSS_TERMS = ['dragao', 'fenrir', 'demonio']
// "horror" é gênero, não peça: responde com o que o catálogo tem de sombrio.
const HORROR_TERMS = ['demonio', 'morto', 'esqueleto', 'ghoul', 'vampiro', 'necromante']

// Aliases conservadores: só termos que a mesma peça responderia. Nada de agrupar
// criaturas diferentes (esqueleto≠zumbi), que produziria resultado irrelevante.
const searchAliases: Record<string, string[]> = {
  dnd: ['rpg'],
  elfo: ['elfico'],
  elfico: ['elfo'],
  mini: ['miniatura'],
  miniatura: ['mini'],
  rpg: ['dnd'],
  pathfinder: ['pf'],
  undead: ['morto', 'mortos'],
  zumbi: ['morto', 'mortos'],
  esqueleto: ['caveira'],
  caveira: ['esqueleto'],
  // Mesma peça de cenário sob dois nomes: o anúncio chama de "Rochas", o comprador procura
  // por "pedra". Não agrupa coisas diferentes, ao contrário de esqueleto/zumbi.
  pedra: ['rocha'],
  rocha: ['pedra'],
  // O uso que o comprador procura vive na descrição, e `searchable` só vê título, categoria e
  // atributos. Em vez de indexar a descrição inteira, cada intenção aponta para a palavra que
  // realmente está no título da peça que a atende.
  rochoso: ['rocha'],
  caverna: ['dungeon'],
  mina: ['cristal', 'rocha'],
  mana: ['cristal'],
  arcano: ['portal'],
  antigo: ['ruina'],
  magico: ['cristal', 'portal'],
  // "infernal" é o adjetivo que o comprador usa para demônio; os demais são hiperônimos.
  infernal: ['demonio'],
  criatura: CREATURE_TERMS,
  monstro: CREATURE_TERMS,
  inimigo: CREATURE_TERMS,
  boss: BOSS_TERMS,
  chefe: BOSS_TERMS,
  // No catálogo, o que tem asa é demônio ou dragão. Não incluí "guerreiro" aqui de propósito:
  // ver o comentário abaixo.
  alado: ['demonio', 'dragao'],
  aberracao: ['demonio'],
  horror: HORROR_TERMS,
  // "besta" é como o comprador chama a criatura bestial; a acepção de besta-arma não existe
  // neste catálogo, então o alias não tem com o que colidir.
  besta: ['bestial'],
}

// Deliberadamente FORA do mapa: `guerreiro: ['demonio']` faria "guerreiro infernal" funcionar,
// mas também faria a busca por "guerreiro" — que é a consulta principal dos kits de guerreiros
// humanos — devolver demônios. Degradar a consulta comum para atender a mais rara é um mau
// negócio, então "guerreiro infernal" fica sem resposta até haver sinal de que alguém busca.

const SAFE_CANONICAL_TERMS: Record<string, string> = {
  orcs: 'orc',
  goblins: 'goblin',
  moedas: 'moeda',
  tokens: 'token',
  minis: 'miniatura',
  mini: 'miniatura',
  miniaturas: 'miniatura',
  mortos: 'morto',
  vivos: 'vivo',
  // "cristais" não contém "cristal" como substring nem fica a uma edição de distância, então
  // sem esta entrada a busca por "cristal" não acha o kit. Os demais plurais de cenário
  // seguem a mesma convenção já usada acima.
  cristais: 'cristal',
  rochas: 'rocha',
  pedras: 'pedra',
  arvores: 'arvore',
  magicos: 'magico',
  portais: 'portal',
  demonios: 'demonio',
  criaturas: 'criatura',
  infernais: 'infernal',
  monstros: 'monstro',
  inimigos: 'inimigo',
  chefes: 'chefe',
  alados: 'alado',
  // "Criaturas Demoníacas" no título não contém "demonio" como substring nem fica a uma edição
  // de distância, então sem isto o produto ficaria invisível para a busca mais óbvia — e também
  // para os hiperônimos, que apontam para `demonio`. Adjetivo e substantivo viram o mesmo token.
  demoniaca: 'demonio',
  demoniacas: 'demonio',
  demoniaco: 'demonio',
  demoniacos: 'demonio',
  aberracoes: 'aberracao',
  // O título diz "Criaturas Bestiais"; quem busca escreve tanto o plural quanto o singular, e
  // "bestiais" não fica a uma edição de "bestial". Adjetivo no plural e no singular viram o
  // mesmo token, nos dois sentidos.
  bestiais: 'bestial',
  bestas: 'besta',
}

function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/d\s*&\s*d/g, 'dnd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeCatalogIntent(value: string): string {
  return normalizeSearch(value)
    .replace(/(\d+)\s+mm\b/g, '$1mm')
    .split(' ')
    .filter(Boolean)
    .map((term) => SAFE_CANONICAL_TERMS[term] || term)
    .join(' ')
}

function oneEditApart(left: string, right: string): boolean {
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false
  let changes = 0
  let leftIndex = 0
  let rightIndex = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }
    changes += 1
    if (changes > 1) return false
    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else {
      leftIndex += 1
      rightIndex += 1
    }
  }
  return changes + Number(leftIndex < left.length || rightIndex < right.length) <= 1
}

// Quantos termos da consulta aparecem literalmente no produto, sem passar por alias. Um produto
// que traz a palavra digitada vale mais que um alcançado por hiperônimo ou sinônimo: quem busca
// "criatura demoníaca" quer começar pelo kit que se chama assim, e não por outro que só é demônio.
// Não filtra nada — é só critério de ordem dentro do conjunto que `matchesSearch` já aprovou.
function literalTermHits(searchable: string, query: string): number {
  return query.split(' ').filter((term) => term && searchable.includes(term)).length
}

function matchesSearch(searchable: string, query: string): boolean {
  if (!query) return true
  const words = searchable.split(' ').filter(Boolean)
  return query.split(' ').every((term) => {
    const alternatives = [term, ...(searchAliases[term] || [])]
    return alternatives.some((alternative) => searchable.includes(alternative) ||
      (alternative.length >= 4 && words.some((word) => oneEditApart(alternative, word))))
  })
}

export function priceRanges(products: Product[]): PriceRange[] {
  const publicProducts = products.filter(isPublicProduct)
  return definitions.filter((range) => publicProducts.some((product) => range.accepts(product.price)))
}

/** Saídas seguras para busca vazia, sem adivinhar intenção nem inventar produtos. */
export function zeroResultOptions(products: Product[], _query: string, category: string) {
  const publicProducts = products.filter(isPublicProduct)
  const categories = [...new Set(publicProducts.map((product) => product.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const suggestions = [...publicProducts].sort((a, b) =>
    Number(b.category === category) - Number(a.category === category) ||
    Number(b.featured) - Number(a.featured) ||
    b.updatedAt.localeCompare(a.updatedAt),
  ).slice(0, 4)
  return { categories, products: suggestions }
}

export function filterAndSortProducts(products: Product[], options: { query: string; category: string; priceRange: PriceRangeId; sort: CatalogSort }): Product[] {
  const query = normalizeCatalogIntent(options.query)
  const range = definitions.find((candidate) => candidate.id === options.priceRange)
  // Relevância entra somente quando há consulta e a ordenação é a padrão. Um pedido explícito de
  // menor preço, maior preço ou A–Z continua respeitado à risca, e sem consulta não existe
  // relevância para medir — a vitrine e as categorias seguem ordenadas por recência.
  const rankByRelevance = Boolean(query) && options.sort === 'recentes'
  return products.map((product) => {
    // `Marketplace` fica de fora: faria toda peça casar com "mercado"/"livre".
    const attributes = Object.entries(product.attributes).filter(([key]) => key !== 'Marketplace').map(([, value]) => value).join(' ')
    const searchable = normalizeCatalogIntent(`${displayTitle(product)} ${product.marketplaceTitle || ''} ${product.category} ${attributes}`)
    return { product, searchable, hits: rankByRelevance ? literalTermHits(searchable, query) : 0 }
  }).filter(({ product, searchable }) => isPublicProduct(product) &&
    (options.category === 'todos' || product.category === options.category) &&
    matchesSearch(searchable, query) &&
    (!range || range.accepts(product.price)),
  ).sort((a, b) => options.sort === 'menor-preco' ? a.product.price - b.product.price
    : options.sort === 'maior-preco' ? b.product.price - a.product.price
      : options.sort === 'az' ? displayTitle(a.product).localeCompare(displayTitle(b.product), 'pt-BR')
        : b.hits - a.hits || b.product.updatedAt.localeCompare(a.product.updatedAt),
  ).map(({ product }) => product)
}
