/**
 * Superfícies que exibem listas de produtos. O identificador vai para `item_list_id` e o
 * rótulo para `item_list_name`, que é o que aparece no relatório "Desempenho da lista de
 * itens" do GA4. Manter a cardinalidade baixa: o valor do relatório vem de comparar poucas
 * listas estáveis, não de criar uma lista por combinação de filtro.
 */
export const PRODUCT_LISTS = {
  'home-destaques': 'Home — Destaques',
  'home-novidades': 'Home — Novidades',
  'home-recentes': 'Home — Vistos recentemente',
  'catalogo': 'Catálogo',
  'busca-zero-resultados': 'Busca sem resultado — sugestões',
  'favoritos': 'Favoritos',
  'guia': 'Guia editorial',
  'landing': 'Landing editorial',
  'produto-relacionados': 'Produto — Relacionados',
} as const

export type ProductListId = keyof typeof PRODUCT_LISTS | `home-familia-${string}`

export const productListName = (id: ProductListId) => id.startsWith('home-familia-') ? 'Home — Família curada' : PRODUCT_LISTS[id as keyof typeof PRODUCT_LISTS]
