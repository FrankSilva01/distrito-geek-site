/**
 * Índice leve dos guias: só o que o hub, o sitemap e a política de metadata precisam.
 *
 * Este módulo existe por causa de desempenho. O corpo dos artigos vive em
 * `guides.ts`, que é importado apenas pela rota do guia (carregada sob demanda).
 * Home, catálogo e produto importam somente este arquivo, então não baixam a prosa
 * de nenhum artigo. Quem adicionar guia novo mexe nos dois: o teste de paridade em
 * `guides.test.ts` falha se eles saírem de sincronia.
 */

export const GUIDE_CLUSTERS = [
  { id: "miniaturas", label: "Miniaturas", description: "Escala, material, preparação, pintura e conservação das peças que vão para a mesa." },
  { id: "rpg-mesa", label: "RPG de Mesa", description: "O básico para quem está começando: como funciona uma mesa, o que é preciso e como dar o primeiro passo." },
  { id: "dnd", label: "D&D", description: "Dungeons & Dragons na prática, do primeiro encontro à escolha das miniaturas." },
  { id: "pathfinder", label: "Pathfinder", description: "Como o sistema usa o grid e o que muda na escolha das peças." },
  { id: "mestre", label: "Mestre de RPG", description: "Preparar sessões, montar encontros e escolher o que realmente vale ter na caixa." },
  { id: "criaturas", label: "Criaturas", description: "Goblins, orcs, mortos-vivos e outros inimigos recorrentes das campanhas." },
  { id: "acessorios", label: "Acessórios", description: "Tokens, marcadores e controles de mesa que agilizam o combate e organizam a sessão." },
] as const

export type GuideClusterId = (typeof GUIDE_CLUSTERS)[number]['id']

export type GuideSummary = {
  slug: string
  cluster: GuideClusterId
  pillar?: boolean
  title: string
  seoTitle: string
  seoDescription: string
  updatedAt: string
  readingMinutes: number
  /**
   * Termos que ligam o guia a produtos reais do catálogo. Fonte única das duas direções:
   * `productsForGuide` seleciona produtos para o guia, `guidesForProduct` seleciona guias
   * para o produto. Vive aqui, e não em `guides.ts`, porque a página de produto precisa
   * dessa ligação sem baixar a prosa dos artigos.
   *
   * Vazio é resposta legítima: significa que o catálogo ainda não tem peça do tema.
   * Evite termo curto e genérico que case por acidente — o casamento usa `includes()`.
   */
  productKeywords: string[]
}

export const GUIDE_INDEX: GuideSummary[] = [
  { slug: "miniaturas-rpg", cluster: "miniaturas", pillar: true, title: "Miniaturas RPG: guia completo para começar", seoTitle: "Miniaturas RPG: Guia Completo para Começar", seoDescription: "Entenda para que servem as miniaturas de RPG, qual escala escolher, diferenças de material e quantas peças um grupo realmente precisa.", updatedAt: "2026-08-09", readingMinutes: 10, productKeywords: ["miniatura", "rpg", "resina"] },
  { slug: "o-que-e-rpg-de-mesa", cluster: "rpg-mesa", title: "O que é RPG de mesa e como funciona?", seoTitle: "O que é RPG de Mesa e Como Funciona?", seoDescription: "RPG de mesa é uma história construída em grupo, com regras e dados para resolver o que é incerto. Entenda os papéis, a estrutura e o que é preciso.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: [] },
  { slug: "como-comecar-rpg-de-mesa", cluster: "rpg-mesa", title: "Como começar a jogar RPG de mesa", seoTitle: "Como Começar a Jogar RPG de Mesa: Guia para Iniciantes", seoDescription: "Do sistema à primeira sessão: como escolher o jogo, reunir o grupo, definir o mestre e separar o material necessário para começar a jogar RPG.", updatedAt: "2026-08-09", readingMinutes: 9, productKeywords: ["kit"] },
  { slug: "como-jogar-dnd", cluster: "dnd", title: "Como jogar D&D: guia para quem nunca jogou", seoTitle: "Como Jogar D&D: Guia para Quem Nunca Jogou", seoDescription: "Entenda como uma mesa de D&D funciona: papéis, criação de personagem, o teste de d20, combate por turnos e o que é essencial para a primeira aventura.", updatedAt: "2026-08-09", readingMinutes: 10, productKeywords: ["d&d"] },
  { slug: "como-ser-mestre-rpg", cluster: "mestre", title: "Como ser mestre de RPG: guia para a primeira sessão", seoTitle: "Como Ser Mestre de RPG: Guia para sua Primeira Sessão", seoDescription: "O que preparar, o que deixar em aberto e como conduzir a primeira sessão como mestre de RPG sem se afogar em anotações que ninguém vai usar.", updatedAt: "2026-08-09", readingMinutes: 10, productKeywords: [] },
  { slug: "criar-encontros-rpg", cluster: "mestre", title: "Como criar encontros de RPG mais divertidos", seoTitle: "Como Criar Encontros de RPG Mais Divertidos", seoDescription: "Encontro não é só combate. Veja como usar objetivo, ambiente e consequência para montar cenas que o grupo vai lembrar, com exemplos prontos para usar.", updatedAt: "2026-08-09", readingMinutes: 10, productKeywords: ["goblin", "kit"] },
  { slug: "miniaturas-essenciais-mestre-rpg", cluster: "mestre", title: "Miniaturas essenciais para todo mestre de RPG", seoTitle: "Miniaturas Essenciais para Todo Mestre de RPG", seoDescription: "Quais miniaturas realmente valem espaço na caixa do mestre, organizadas por função e versatilidade em vez de quantidade, e em que ordem comprar.", updatedAt: "2026-08-09", readingMinutes: 9, productKeywords: ["kit", "goblin", "esqueleto"] },
  { slug: "goblins-rpg", cluster: "criaturas", title: "Goblins no RPG: como usar em D&D e outras aventuras", seoTitle: "Goblins no RPG: Como Usar em D&D e Outras Aventuras", seoDescription: "Goblins funcionam melhor em grupo, com funções diferentes e terreno a favor. Veja como montar emboscadas e encontros que o grupo vai lembrar.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: ["goblin"] },
  { slug: "mortos-vivos-rpg", cluster: "criaturas", title: "Mortos-vivos no RPG: tipos e ideias para sua campanha", seoTitle: "Mortos-Vivos no RPG: Tipos e Ideias para sua Campanha", seoDescription: "Esqueletos, hordas, cavaleiros e necromantes rendem encontros diferentes. Veja como usar cada tipo e criar cenas de terror que não repetem.", updatedAt: "2026-08-09", readingMinutes: 9, productKeywords: ["mortos-vivos", "mortos vivos", "esqueleto"] },
  { slug: "orcs-rpg", cluster: "criaturas", title: "Orcs no RPG: como criar inimigos memoráveis", seoTitle: "Orcs no RPG: Como Criar Encontros e Inimigos Memoráveis", seoDescription: "Orcs rendem mais quando não são todos iguais. Veja como usar clãs, hierarquia e motivação para criar antagonistas e até aliados na sua campanha.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: ["orc"] },
  { slug: "dnd-vs-pathfinder", cluster: "pathfinder", title: "D&D ou Pathfinder: qual RPG escolher?", seoTitle: "D&D ou Pathfinder: Qual RPG Escolher?", seoDescription: "Comparação honesta entre D&D e Pathfinder em curva de aprendizado, customização, combate e preparação, para escolher pelo perfil do seu grupo.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: ["pathfinder"] },
  { slug: "escala-miniaturas-rpg-28mm-32mm-75mm", cluster: "miniaturas", title: "Escala de miniaturas RPG: diferenças entre 28 mm, 32 mm e 75 mm", seoTitle: "Escala de Miniaturas RPG: 28mm, 32mm e 75mm", seoDescription: "Entenda as diferenças entre miniaturas RPG de 28 mm, 32 mm e 75 mm e escolha a escala certa para mapas, pintura e coleção.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: ["32mm", "75mm", "miniatura"] },
  { slug: "como-pintar-miniaturas-resina", cluster: "miniaturas", title: "Como preparar e pintar miniaturas de resina", seoTitle: "Como Pintar Miniaturas de Resina: Guia Prático", seoDescription: "Aprenda a preparar, aplicar primer e pintar miniaturas de resina com segurança, preservando detalhes e melhorando o acabamento.", updatedAt: "2026-08-09", readingMinutes: 9, productKeywords: ["resina", "sem pintura", "miniatura"] },
  { slug: "miniaturas-para-comecar-campanha-dnd", cluster: "dnd", title: "Quais miniaturas comprar para começar uma campanha de D&D", seoTitle: "Miniaturas para Começar uma Campanha de D&D", seoDescription: "Veja quais heróis, criaturas e kits priorizar ao montar a primeira seleção de miniaturas para uma campanha de D&D.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: ["d&d", "guerreiro", "goblin", "esqueleto", "mago"] },
  { slug: "como-escolher-miniaturas-pathfinder", cluster: "pathfinder", title: "Como escolher miniaturas para Pathfinder", seoTitle: "Como Escolher Miniaturas para Pathfinder", seoDescription: "Escolha miniaturas para Pathfinder considerando personagem, criatura, escala, base e utilidade nos encontros da campanha.", updatedAt: "2026-08-09", readingMinutes: 7, productKeywords: ["pathfinder", "goblin", "esqueleto", "necromante"] },
  { slug: "cuidados-miniaturas-resina", cluster: "miniaturas", title: "Como cuidar e conservar miniaturas de resina", seoTitle: "Cuidados com Miniaturas de Resina: Conservação", seoDescription: "Saiba como guardar, limpar, transportar e conservar miniaturas de resina, protegendo pintura e detalhes delicados.", updatedAt: "2026-08-09", readingMinutes: 7, productKeywords: ["resina", "miniatura", "figure"] },
  { slug: "tokens-rpg", cluster: "acessorios", title: "Tokens de RPG: o que são e como usar na mesa", seoTitle: "Tokens de RPG: O que São e Como Usar na Mesa", seoDescription: "Entenda o que são tokens de RPG, para que servem no combate e na organização da mesa e como usá-los ao lado das miniaturas dos personagens.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: [] },
  { slug: "marcadores-iniciativa-rpg", cluster: "acessorios", title: "Marcadores de iniciativa no RPG: como funcionam", seoTitle: "Marcadores de Iniciativa no RPG: Como Funcionam", seoDescription: "Marcadores de iniciativa mostram a ordem dos turnos no combate de RPG. Veja como funcionam, onde ficam e como manter o ritmo da mesa sem confusão.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: [] },
  { slug: "spell-slot-tracker", cluster: "acessorios", title: "Spell slot tracker: como controlar espaços de magia", seoTitle: "Spell Slot Tracker: Como Controlar Espaços de Magia", seoDescription: "Spell slot tracker é o controle dos espaços de magia de um conjurador. Veja para que serve na mesa de RPG e alternativas simples de registro.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: [] },
  { slug: "aneis-status-rpg", cluster: "acessorios", title: "Anéis de status no RPG: como organizar condições na mesa", seoTitle: "Anéis de Status no RPG: Como Organizar Condições na Mesa", seoDescription: "Anéis de status marcam condições nas miniaturas de RPG. Veja para que servem, como diferenciar efeitos e organizar o combate sem esquecer nada.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: [] },
  { slug: "marcador-concentracao-dnd", cluster: "acessorios", title: "Concentração em D&D: como controlar na mesa", seoTitle: "Concentração em D&D: Como Controlar na Mesa", seoDescription: "Concentração em D&D define muitas magias e é fácil de esquecer. Veja o que ela representa e como marcar com token, anel ou marcador na mesa.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: [] },
]

export const guideSummaryBySlug = (slug: string) => GUIDE_INDEX.find((guide) => guide.slug === slug)

/**
 * Texto do produto contra o qual as palavras-chave são casadas, nas duas direções.
 * Tipado estruturalmente para este módulo não depender de `domain/product`.
 */
export const guideMatchText = (product: { title: string; storefrontTitle?: string; description: string; category: string; attributes: Record<string, string> }) =>
  `${product.storefrontTitle || product.title} ${product.description} ${product.category} ${Object.values(product.attributes).join(' ')}`.toLowerCase()

/**
 * Guias que têm relação real com um produto, do mais específico para o mais genérico.
 *
 * A ordem importa: um guia com poucas palavras-chave que casou é mais específico que o
 * pilar, que casa com quase toda miniatura. Sem casamento, devolve lista vazia — a página
 * de produto não deve inventar bloco de links.
 */
export function guidesForProduct(searchable: string, limit = 3): GuideSummary[] {
  const haystack = searchable.toLowerCase()
  return GUIDE_INDEX
    .filter((guide) => guide.productKeywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
    .sort((a, b) => a.productKeywords.length - b.productKeywords.length || Number(Boolean(a.pillar)) - Number(Boolean(b.pillar)))
    .slice(0, limit)
}
export const pillarGuide = () => GUIDE_INDEX.find((guide) => guide.pillar)
export const clusterById = (id: GuideClusterId) => GUIDE_CLUSTERS.find((cluster) => cluster.id === id)

/** Guias agrupados por cluster, na ordem de GUIDE_CLUSTERS, sem clusters vazios. */
export function guidesByCluster(guides: GuideSummary[] = GUIDE_INDEX) {
  return GUIDE_CLUSTERS.map((cluster) => ({ cluster, guides: guides.filter((guide) => guide.cluster === cluster.id && !guide.pillar) })).filter((group) => group.guides.length > 0)
}
