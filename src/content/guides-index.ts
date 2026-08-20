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
  { slug: "criar-encontros-rpg", cluster: "mestre", title: "Como criar encontros de RPG mais divertidos", seoTitle: "Como Criar Encontros de RPG Mais Divertidos", seoDescription: "Encontro não é só combate. Veja como usar objetivo, ambiente e consequência para montar cenas que o grupo vai lembrar, com exemplos prontos para usar.", updatedAt: "2026-08-09", readingMinutes: 10, productKeywords: ["goblin", "kit", "cenário"] },
  { slug: "miniaturas-essenciais-mestre-rpg", cluster: "mestre", title: "Miniaturas essenciais para todo mestre de RPG", seoTitle: "Miniaturas Essenciais para Todo Mestre de RPG", seoDescription: "Quais miniaturas realmente valem espaço na caixa do mestre, organizadas por função e versatilidade em vez de quantidade, e em que ordem comprar.", updatedAt: "2026-08-09", readingMinutes: 9, productKeywords: ["kit", "goblin", "esqueleto"] },
  { slug: "goblins-rpg", cluster: "criaturas", title: "Goblins no RPG: como usar em D&D e outras aventuras", seoTitle: "Goblins no RPG: Como Usar em D&D e Outras Aventuras", seoDescription: "Goblins funcionam melhor em grupo, com funções diferentes e terreno a favor. Veja como montar emboscadas e encontros que o grupo vai lembrar.", updatedAt: "2026-08-09", readingMinutes: 8, productKeywords: ["goblin"] },
  { slug: "mortos-vivos-rpg", cluster: "criaturas", title: "Mortos-vivos no RPG: tipos e ideias para sua campanha", seoTitle: "Mortos-Vivos no RPG: Tipos e Ideias para sua Campanha", seoDescription: "Esqueletos, hordas, cavaleiros e necromantes rendem encontros diferentes. Veja como usar cada tipo e criar cenas de terror que não repetem.", updatedAt: "2026-08-09", readingMinutes: 9, productKeywords: ["mortos-vivos", "mortos vivos", "morto vivo", "esqueleto"] },
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
  { slug: "como-usar-miniaturas-rpg", cluster: "miniaturas", title: "Como usar miniaturas de RPG na mesa", seoTitle: "Como Usar Miniaturas de RPG na Mesa", seoDescription: "Miniaturas ajudam a visualizar posição e combate no RPG. Veja como usá-las no grid, medir movimento e alcance e manter a mesa organizada.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["miniatura", "rpg"] },
  { slug: "miniaturas-resina-vs-plastico", cluster: "miniaturas", title: "Miniaturas de resina ou plástico: qual escolher?", seoTitle: "Miniaturas de Resina ou Plástico: Qual Escolher?", seoDescription: "Resina ou plástico nas miniaturas de RPG? Compare detalhe, resistência, preparação e uso na mesa para escolher o material certo para você.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["resina", "miniatura"] },
  { slug: "dados-dnd", cluster: "dnd", title: "Dados de D&D: quais são e para que serve cada um", seoTitle: "Dados de D&D: Quais São e Para Que Serve Cada Um", seoDescription: "Quais dados o D&D usa e para que serve cada um? Entenda o d20, os dados de dano e como ler uma rolagem sem decorar tabela nenhuma.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: [] },
  { slug: "esqueletos-rpg", cluster: "criaturas", title: "Esqueletos no RPG: tipos, táticas e encontros", seoTitle: "Esqueletos no RPG: Tipos, Táticas e Encontros", seoDescription: "Esqueletos são o morto-vivo mais versátil do RPG. Veja tipos, táticas de combate e como usá-los em encontros de D&D e outras campanhas.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["esqueleto"] },
  { slug: "o-que-e-dnd", cluster: "dnd", title: "O que é D&D: entenda o RPG de fantasia mais jogado", seoTitle: "O que é D&D: Entenda o RPG de Fantasia Mais Jogado", seoDescription: "D&D é o RPG de fantasia mais conhecido do mundo. Entenda o que é, como uma mesa funciona e o que você precisa para jogar a primeira aventura.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["d&d"] },
  { slug: "classes-dnd", cluster: "dnd", title: "Classes de D&D: os papéis do personagem no grupo", seoTitle: "Classes de D&D: Os Papéis do Personagem no Grupo", seoDescription: "As classes de D&D definem o papel do personagem no grupo. Entenda os arquétipos — combate, magia, furtividade e suporte — e como escolher a sua.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["mago", "guerreiro"] },
  { slug: "como-criar-aventura-rpg", cluster: "mestre", title: "Como criar uma aventura de RPG do zero", seoTitle: "Como Criar uma Aventura de RPG do Zero", seoDescription: "Criar uma aventura de RPG é montar um problema com começo, meio e escolhas. Veja como estruturar gancho, cenas e desfecho sem escrever um romance.", updatedAt: "2026-08-11", readingMinutes: 9, productKeywords: [] },
  { slug: "zumbis-rpg", cluster: "criaturas", title: "Zumbis no RPG: como usar a horda a seu favor", seoTitle: "Zumbis no RPG: Como Usar a Horda a Seu Favor", seoDescription: "Zumbis são o morto-vivo de horda por excelência no RPG. Veja como usar a pressão lenta, o terror e o número a favor do encontro na sua mesa.", updatedAt: "2026-08-11", readingMinutes: 7, productKeywords: ["mortos"] },
  { slug: "dragao-rpg", cluster: "criaturas", title: "Dragões no RPG: como usar o clímax da campanha", seoTitle: "Dragões no RPG: Como Usar o Clímax da Campanha", seoDescription: "O dragão é o clímax de muitas campanhas de RPG. Veja como usá-lo como ameaça, aliado ou lenda e como construir o encontro à altura da criatura.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["dragão"] },
  { slug: "necromante-rpg", cluster: "criaturas", title: "Necromante no RPG: como usar na campanha e nos encontros", seoTitle: "Necromante no RPG: Como Usar na Campanha e nos Encontros", seoDescription: "Necromantes rendem como vilões, NPCs e líderes de mortos-vivos no RPG. Veja como usá-los na campanha, montar encontros e escolher a miniatura.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["necromante"] },
  { slug: "vampiros-rpg", cluster: "criaturas", title: "Vampiros no RPG: campanhas, encontros e miniaturas", seoTitle: "Vampiros no RPG: Campanhas, Encontros e Miniaturas", seoDescription: "Vampiros funcionam como vilões, antagonistas políticos e ameaças de terror no RPG. Veja como usá-los, montar encontros e escolher miniaturas.", updatedAt: "2026-08-11", readingMinutes: 8, productKeywords: ["vampiro"] },
  { slug: "cenarios-para-rpg-de-mesa", cluster: "mestre", title: "Cenários para RPG de mesa: tipos, terrenos e como usar", seoTitle: "Cenários para RPG de Mesa: Terrenos, Ruínas e Dungeons", seoDescription: "Cenários 3D para RPG de mesa: veja os tipos de terreno — ruínas, árvores, rochas, cristais e portais — e como usá-los em dungeons e encontros.", updatedAt: "2026-08-20", readingMinutes: 11, productKeywords: ["portal", "templo", "rocha", "cristais", "árvore", "modular"] },
]

export const guideSummaryBySlug = (slug: string) => GUIDE_INDEX.find((guide) => guide.slug === slug)

/**
 * Texto do produto contra o qual as palavras-chave são casadas, nas duas direções.
 * Tipado estruturalmente para este módulo não depender de `domain/product`.
 */
export const guideMatchText = (product: { title: string; storefrontTitle?: string; description: string; category: string; attributes: Record<string, string> }) =>
  `${product.storefrontTitle || product.title} ${product.description} ${product.category} ${Object.values(product.attributes).join(' ')}`.toLowerCase()

/**
 * Normaliza texto para comparar keyword com a identidade do guia (slug + seoTitle):
 * minúsculas, sem acento, `d&d`→`dnd`, e remove o `s` final de cada palavra antes de juntar.
 * O stemming de plural faz 'morto vivo' casar a identidade 'mortos-vivos-rpg' e 'goblin' casar
 * 'goblins-rpg' — assim singular/plural do mesmo assunto contam como identidade. Só afeta a
 * detecção de identidade, não o casamento de produto (que continua por `includes` cru).
 */
const normalizeIdentity = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/d\s*&\s*d/g, 'dnd').split(/[^a-z0-9]+/).filter(Boolean).map((word) => word.replace(/s$/, '')).join('')

/**
 * Guias com relação real com um produto, do mais específico ao mais genérico. A ordenação
 * combina dois sinais, nesta prioridade:
 *
 * 1. ESPECIFICIDADE SEMÂNTICA (assunto do guia): uma keyword só confere relevância forte se
 *    for o assunto do próprio guia — aparece no slug/seoTitle. 'goblin' é o assunto de
 *    goblins-rpg; 'necromante' é apenas um exemplo citado em como-escolher-miniaturas-pathfinder,
 *    cujo assunto é Pathfinder. Sem esse gate, uma keyword rara e incidental (necromante,
 *    freq 1) sequestrava o ranking.
 * 2. RARIDADE NO CATÁLOGO (só como desempate dentro do mesmo tipo de relação): entre keywords
 *    de assunto, a que casa menos produtos vence ('goblin' > 'd&d').
 *
 * Regras por guia:
 * - Guia SEM keyword de identidade (ex.: classes-dnd/[mago,guerreiro]): suas keywords são o
 *   próprio assunto — confia na keyword casada mais rara.
 * - Guia COM keyword de identidade (ex.: .../pathfinder): se uma keyword de identidade casou,
 *   rankeia por ela (o assunto real); se só casou keyword incidental, a relação é fraca e cai
 *   para o fim (base > qualquer frequência possível).
 *
 * `catalogHaystacks` são os `guideMatchText` de todos os produtos públicos, que a página de
 * produto já tem em memória — o índice leve segue sem importar o catálogo nem o corpo dos
 * guias, preservando o code-splitting. Sem catálogo, degrada de forma coerente. Sem
 * casamento, devolve lista vazia.
 */
export function guidesForProduct(searchable: string, catalogHaystacks: string[] = [], limit = 3): GuideSummary[] {
  const haystack = searchable.toLowerCase()
  const catalogFrequency = (keyword: string) => catalogHaystacks.reduce((count, text) => count + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0)
  const weakBase = catalogHaystacks.length + 1 // maior que qualquer frequência possível
  const specificity = (guide: GuideSummary) => {
    const matched = guide.productKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase()))
    const identity = normalizeIdentity(`${guide.slug} ${guide.seoTitle}`)
    const identityKeywords = guide.productKeywords.filter((keyword) => identity.includes(normalizeIdentity(keyword)))
    if (!identityKeywords.length) return Math.min(...matched.map(catalogFrequency))
    const identityMatched = matched.filter((keyword) => identityKeywords.includes(keyword))
    return identityMatched.length ? Math.min(...identityMatched.map(catalogFrequency)) : weakBase + Math.min(...matched.map(catalogFrequency))
  }
  return GUIDE_INDEX
    .filter((guide) => guide.productKeywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
    .map((guide) => ({ guide, score: specificity(guide) }))
    .sort((a, b) => a.score - b.score || a.guide.productKeywords.length - b.guide.productKeywords.length || Number(Boolean(a.guide.pillar)) - Number(Boolean(b.guide.pillar)))
    .slice(0, limit)
    .map((entry) => entry.guide)
}
export const pillarGuide = () => GUIDE_INDEX.find((guide) => guide.pillar)
export const clusterById = (id: GuideClusterId) => GUIDE_CLUSTERS.find((cluster) => cluster.id === id)

/** Guias agrupados por cluster, na ordem de GUIDE_CLUSTERS, sem clusters vazios. */
export function guidesByCluster(guides: GuideSummary[] = GUIDE_INDEX) {
  return GUIDE_CLUSTERS.map((cluster) => ({ cluster, guides: guides.filter((guide) => guide.cluster === cluster.id && !guide.pillar) })).filter((group) => group.guides.length > 0)
}
