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
}

export const GUIDE_INDEX: GuideSummary[] = [
  { slug: "miniaturas-rpg", cluster: "miniaturas", pillar: true, title: "Miniaturas RPG: guia completo para começar", seoTitle: "Miniaturas RPG: Guia Completo para Começar", seoDescription: "Entenda para que servem as miniaturas de RPG, qual escala escolher, diferenças de material e quantas peças um grupo realmente precisa.", updatedAt: "2026-08-09", readingMinutes: 10 },
  { slug: "o-que-e-rpg-de-mesa", cluster: "rpg-mesa", title: "O que é RPG de mesa e como funciona?", seoTitle: "O que é RPG de Mesa e Como Funciona?", seoDescription: "RPG de mesa é uma história construída em grupo, com regras e dados para resolver o que é incerto. Entenda os papéis, a estrutura e o que é preciso.", updatedAt: "2026-08-09", readingMinutes: 8 },
  { slug: "como-comecar-rpg-de-mesa", cluster: "rpg-mesa", title: "Como começar a jogar RPG de mesa", seoTitle: "Como Começar a Jogar RPG de Mesa: Guia para Iniciantes", seoDescription: "Do sistema à primeira sessão: como escolher o jogo, reunir o grupo, definir o mestre e separar o material necessário para começar a jogar RPG.", updatedAt: "2026-08-09", readingMinutes: 9 },
  { slug: "como-jogar-dnd", cluster: "dnd", title: "Como jogar D&D: guia para quem nunca jogou", seoTitle: "Como Jogar D&D: Guia para Quem Nunca Jogou", seoDescription: "Entenda como uma mesa de D&D funciona: papéis, criação de personagem, o teste de d20, combate por turnos e o que é essencial para a primeira aventura.", updatedAt: "2026-08-09", readingMinutes: 10 },
  { slug: "como-ser-mestre-rpg", cluster: "mestre", title: "Como ser mestre de RPG: guia para a primeira sessão", seoTitle: "Como Ser Mestre de RPG: Guia para sua Primeira Sessão", seoDescription: "O que preparar, o que deixar em aberto e como conduzir a primeira sessão como mestre de RPG sem se afogar em anotações que ninguém vai usar.", updatedAt: "2026-08-09", readingMinutes: 10 },
  { slug: "criar-encontros-rpg", cluster: "mestre", title: "Como criar encontros de RPG mais divertidos", seoTitle: "Como Criar Encontros de RPG Mais Divertidos", seoDescription: "Encontro não é só combate. Veja como usar objetivo, ambiente e consequência para montar cenas que o grupo vai lembrar, com exemplos prontos para usar.", updatedAt: "2026-08-09", readingMinutes: 10 },
  { slug: "miniaturas-essenciais-mestre-rpg", cluster: "mestre", title: "Miniaturas essenciais para todo mestre de RPG", seoTitle: "Miniaturas Essenciais para Todo Mestre de RPG", seoDescription: "Quais miniaturas realmente valem espaço na caixa do mestre, organizadas por função e versatilidade em vez de quantidade, e em que ordem comprar.", updatedAt: "2026-08-09", readingMinutes: 9 },
  { slug: "escala-miniaturas-rpg-28mm-32mm-75mm", cluster: "miniaturas", title: "Escala de miniaturas RPG: diferenças entre 28 mm, 32 mm e 75 mm", seoTitle: "Escala de Miniaturas RPG: 28mm, 32mm e 75mm", seoDescription: "Entenda as diferenças entre miniaturas RPG de 28 mm, 32 mm e 75 mm e escolha a escala certa para mapas, pintura e coleção.", updatedAt: "2026-08-09", readingMinutes: 8 },
  { slug: "como-pintar-miniaturas-resina", cluster: "miniaturas", title: "Como preparar e pintar miniaturas de resina", seoTitle: "Como Pintar Miniaturas de Resina: Guia Prático", seoDescription: "Aprenda a preparar, aplicar primer e pintar miniaturas de resina com segurança, preservando detalhes e melhorando o acabamento.", updatedAt: "2026-08-09", readingMinutes: 9 },
  { slug: "miniaturas-para-comecar-campanha-dnd", cluster: "dnd", title: "Quais miniaturas comprar para começar uma campanha de D&D", seoTitle: "Miniaturas para Começar uma Campanha de D&D", seoDescription: "Veja quais heróis, criaturas e kits priorizar ao montar a primeira seleção de miniaturas para uma campanha de D&D.", updatedAt: "2026-08-09", readingMinutes: 8 },
  { slug: "como-escolher-miniaturas-pathfinder", cluster: "pathfinder", title: "Como escolher miniaturas para Pathfinder", seoTitle: "Como Escolher Miniaturas para Pathfinder", seoDescription: "Escolha miniaturas para Pathfinder considerando personagem, criatura, escala, base e utilidade nos encontros da campanha.", updatedAt: "2026-08-09", readingMinutes: 7 },
  { slug: "cuidados-miniaturas-resina", cluster: "miniaturas", title: "Como cuidar e conservar miniaturas de resina", seoTitle: "Cuidados com Miniaturas de Resina: Conservação", seoDescription: "Saiba como guardar, limpar, transportar e conservar miniaturas de resina, protegendo pintura e detalhes delicados.", updatedAt: "2026-08-09", readingMinutes: 7 },
]

export const guideSummaryBySlug = (slug: string) => GUIDE_INDEX.find((guide) => guide.slug === slug)
export const pillarGuide = () => GUIDE_INDEX.find((guide) => guide.pillar)
export const clusterById = (id: GuideClusterId) => GUIDE_CLUSTERS.find((cluster) => cluster.id === id)

/** Guias agrupados por cluster, na ordem de GUIDE_CLUSTERS, sem clusters vazios. */
export function guidesByCluster(guides: GuideSummary[] = GUIDE_INDEX) {
  return GUIDE_CLUSTERS.map((cluster) => ({ cluster, guides: guides.filter((guide) => guide.cluster === cluster.id && !guide.pillar) })).filter((group) => group.guides.length > 0)
}
