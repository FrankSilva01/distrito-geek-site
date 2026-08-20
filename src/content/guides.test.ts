import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { metadataForRoute, SITE_ORIGIN } from '../seo/metadata'
import { sitemapPaths } from '../../netlify/functions/sitemap'
import { GUIDES, productsForGuide } from './guides'
import { GUIDE_CLUSTERS, GUIDE_INDEX, guideMatchText, guidesByCluster, guidesForProduct, pillarGuide } from './guides-index'

const clusterIds = new Set(GUIDE_CLUSTERS.map((cluster) => cluster.id))
const slugs = new Set(GUIDES.map((guide) => guide.slug))

describe('editorial SEO guides', () => {
  it('publishes guides with unique metadata and enough substance', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(5)
    expect(new Set(GUIDES.map((guide) => guide.slug)).size).toBe(GUIDES.length)
    expect(new Set(GUIDES.map((guide) => guide.seoTitle)).size).toBe(GUIDES.length)
    for (const guide of GUIDES) {
      const words = [guide.intro, ...guide.sections.flatMap((section) => [section.body, ...(section.items || [])]), ...guide.faq.flatMap((item) => [item.question, item.answer])].join(' ').split(/\s+/).length
      expect(guide.seoDescription.length, guide.slug).toBeGreaterThanOrEqual(100)
      expect(guide.seoDescription.length, guide.slug).toBeLessThanOrEqual(160)
      expect(guide.sections.length, guide.slug).toBeGreaterThanOrEqual(4)
      expect(guide.faq.length, guide.slug).toBeGreaterThanOrEqual(2)
      expect(guide.relatedGuideSlugs.length, guide.slug).toBeGreaterThanOrEqual(2)
      expect(words, guide.slug).toBeGreaterThanOrEqual(350)
    }
  })

  // O indice leve existe por desempenho e duplica a metadata de proposito. Este teste e o
  // que garante que ele nao saia de sincronia com o corpo dos artigos.
  it('keeps the lightweight index in sync with the editorial content', () => {
    expect(GUIDE_INDEX.map((guide) => guide.slug)).toEqual(GUIDES.map((guide) => guide.slug))
    for (const summary of GUIDE_INDEX) {
      const full = GUIDES.find((guide) => guide.slug === summary.slug)!
      expect(summary, summary.slug).toEqual({
        slug: full.slug,
        cluster: full.cluster,
        ...(full.pillar ? { pillar: true } : {}),
        title: full.title,
        seoTitle: full.seoTitle,
        seoDescription: full.seoDescription,
        updatedAt: full.updatedAt,
        readingMinutes: full.readingMinutes,
        productKeywords: summary.productKeywords,
      })
    }
  })

  // Uma palavra-chave curta demais casa por acidente via includes(): 'orc' dentro de
  // 'orcamento', por exemplo. Guia sem peça no catálogo deve ficar com lista vazia.
  it('liga guias a produtos reais sem casar por acidente', () => {
    const products = loadSeedCatalog()
    for (const guide of GUIDE_INDEX) {
      for (const keyword of guide.productKeywords) {
        expect(keyword.length, `${guide.slug}: "${keyword}" e curta demais para includes()`).toBeGreaterThanOrEqual(3)
        expect(keyword, `${guide.slug}: "${keyword}" deve ser minuscula`).toBe(keyword.toLowerCase())
      }
      const matched = productsForGuide(guide, products)
      if (guide.productKeywords.length) expect(matched.length, `${guide.slug} tem keyword que nao casa com nenhum produto`).toBeGreaterThan(0)
      else expect(matched).toHaveLength(0)
    }
  })

  // `guidesForProduct` só faz toLowerCase, NÃO remove acento. Uma keyword "cenario" sem acento
  // nunca casa com um título que diz "Cenário", e o guia continuaria passando no teste acima
  // por causa das outras keywords — ou seja, a keyword ficaria morta em silêncio.
  it('liga o guia de encontros às peças de cenário, com o acento que o matching exige', () => {
    const encontros = GUIDE_INDEX.find((guide) => guide.slug === 'criar-encontros-rpg')
    expect(encontros?.productKeywords, 'a keyword de cenário precisa do acento').toContain('cenário')

    const titulos = [
      'Kit 10 Rochas RPG Cenário 3D Terreno Modular Dungeon',
      'Portal Em Ruínas RPG Cenário 3D Dungeon Fantasia Wargame',
      'Kit 10 Cristais Mágicos RPG Cenário 3D Dungeon Wargame',
    ]
    for (const titulo of titulos) {
      expect(guidesForProduct(titulo, titulos, 5).map((guide) => guide.slug), titulo).toContain('criar-encontros-rpg')
    }
    // Sem acento não casa. A frase evita "kit" e "goblin" de propósito, senão o guia entraria
    // pelas outras keywords e o teste passaria sem provar nada sobre o acento.
    const semAcento = 'Peca de terreno sem acento cenario'
    expect(guidesForProduct(semAcento, [semAcento], 5).map((guide) => guide.slug)).not.toContain('criar-encontros-rpg')
  })

  it('sugere guias para um produto sem depender do corpo dos artigos', () => {
    const goblin = loadSeedCatalog().find((product) => product.title.toLowerCase().includes('goblin'))!
    const suggested = guidesForProduct(guideMatchText(goblin))
    expect(suggested.length).toBeGreaterThan(0)
    expect(suggested.length).toBeLessThanOrEqual(3)
    expect(suggested.map((guide) => guide.slug)).toContain('goblins-rpg')
    // O pilar casa com quase toda miniatura; o guia especifico precisa vir antes dele.
    expect(suggested[0].slug).not.toBe('miniaturas-rpg')
    expect(guidesForProduct('suporte de toalha travado por pressao')).toEqual([])
  })

  // Regressão do bug de ranking: com o catálogo em mãos, o guia da criatura específica
  // (keyword rara: mortos/esqueleto) deve vencer os guias informacionais genéricos que
  // casam por 'd&d' ou 'kit', que aparecem em quase todo produto de RPG.
  it('prioriza o guia específico sobre o genérico quando o produto casa com vários', () => {
    const catalog = loadSeedCatalog()
    const haystacks = catalog.map(guideMatchText)
    const undead = catalog.find((product) => /mortos-?vivos/i.test(product.title))!
    const forUndead = guidesForProduct(guideMatchText(undead), haystacks).map((guide) => guide.slug)
    expect(forUndead, 'o guia de mortos-vivos precisa aparecer no bloco do produto de mortos-vivos').toContain('mortos-vivos-rpg')
    expect(forUndead.indexOf('mortos-vivos-rpg')).toBeLessThan(forUndead.indexOf('como-jogar-dnd') === -1 ? Infinity : forUndead.indexOf('como-jogar-dnd'))

    const skeleton = catalog.find((product) => /esqueleto/i.test(product.title))!
    const forSkeleton = guidesForProduct(guideMatchText(skeleton), haystacks).map((guide) => guide.slug)
    expect(forSkeleton[0], 'o mais específico deve liderar').not.toBe('como-jogar-dnd')
    expect(forSkeleton).toContain('esqueletos-rpg')

    // Sem catálogo, mantém a compatibilidade (cai para a heurística de contagem).
    expect(guidesForProduct(guideMatchText(undead)).length).toBeGreaterThan(0)
  })

  // Especificidade SEMÂNTICA acima de raridade ACIDENTAL: uma keyword rara mas incidental
  // (necromante em um guia de seleção de Pathfinder) não pode fazer esse guia liderar.
  // Só vale como sinal forte a keyword que também é o assunto do guia (aparece no slug/título).
  it('não deixa keyword incidental rara sequestrar o ranking produto->guia', () => {
    const catalog = loadSeedCatalog()
    const haystacks = catalog.map(guideMatchText)
    const lead = (product: (typeof catalog)[number]) => guidesForProduct(guideMatchText(product), haystacks).map((guide) => guide.slug)
    const byTitle = (pattern: RegExp) => catalog.find((product) => pattern.test(product.title))!

    // 'necromante' é keyword de como-escolher-miniaturas-pathfinder, mas o assunto do guia
    // é Pathfinder, não necromante — o guia não pode aparecer no topo por causa disso.
    const necromante = lead(byTitle(/necromante/i))
    expect(necromante.indexOf('como-escolher-miniaturas-pathfinder'), 'guia de Pathfinder não pode liderar por keyword incidental de criatura').not.toBe(0)

    // Casos que DEVEM continuar liderando pelo guia específico verdadeiro:
    expect(lead(byTitle(/goblin/i))[0]).toBe('goblins-rpg')
    expect(lead(byTitle(/drag[aã]o/i))[0]).toBe('dragao-rpg')
    expect(lead(byTitle(/mortos-?vivos/i))[0]).toBe('mortos-vivos-rpg')
    expect(lead(byTitle(/\borcs?\b/i))[0]).toBe('orcs-rpg')
    // Mago: 'mago' não está no título de classes-dnd, mas é o assunto (classe) — deve liderar,
    // já que o guia não tem outra keyword de identidade competindo.
    expect(lead(byTitle(/mago/i))[0]).toBe('classes-dnd')

    // Ghoul é um morto-vivo escrito no singular ("Morto Vivo"): o stemming de plural na
    // detecção de identidade faz 'morto vivo' contar como assunto de mortos-vivos-rpg, então
    // o panorama de mortos-vivos lidera em vez de um guia genérico de Pathfinder.
    expect(lead(byTitle(/ghoul/i))[0]).toBe('mortos-vivos-rpg')
  })

  // Guias novos de criatura: o produto real correspondente deve liderar pelo mecanismo
  // semântico (keyword de identidade), sem hardcode. O produto de necromante teve o título
  // "Pathfind" corrigido para "Pathfinder", mas o guia específico segue no topo mesmo assim.
  it('faz o produto de necromante e de vampiro liderarem seus guias específicos', () => {
    const catalog = loadSeedCatalog()
    const haystacks = catalog.map(guideMatchText)
    const leadOf = (pattern: RegExp) => {
      const product = catalog.find((item) => pattern.test(item.title))!
      return guidesForProduct(guideMatchText(product), haystacks).map((guide) => guide.slug)
    }
    expect(leadOf(/necromante/i)[0]).toBe('necromante-rpg')
    expect(leadOf(/vampiro/i)[0]).toBe('vampiros-rpg')

    // E os guias novos puxam exatamente o produto real correspondente (guia->produto).
    const necromanteGuide = GUIDES.find((guide) => guide.slug === 'necromante-rpg')!
    const vampiroGuide = GUIDES.find((guide) => guide.slug === 'vampiros-rpg')!
    const necromanteProducts = productsForGuide(necromanteGuide, catalog)
    const vampiroProducts = productsForGuide(vampiroGuide, catalog)
    expect(necromanteProducts.length).toBeGreaterThan(0)
    expect(necromanteProducts.every((product) => /necromante/i.test(product.title))).toBe(true)
    expect(vampiroProducts.length).toBeGreaterThan(0)
    expect(vampiroProducts.every((product) => /vampiro/i.test(product.title))).toBe(true)
  })

  it('assigns every guide to a known cluster', () => {
    for (const guide of GUIDES) expect(clusterIds, guide.slug).toContain(guide.cluster)
  })

  it('keeps internal links pointing at guides that exist', () => {
    for (const guide of GUIDES) {
      for (const related of guide.relatedGuideSlugs) {
        expect(slugs, `${guide.slug} -> ${related}`).toContain(related)
        expect(related, `${guide.slug} nao deve apontar para si mesmo`).not.toBe(guide.slug)
      }
    }
  })

  it('keeps contextual section links pointing at guides that exist', () => {
    for (const guide of GUIDES) {
      for (const section of guide.sections) {
        for (const link of section.links ?? []) {
          expect(link.label.length, `${guide.slug} link sem rotulo`).toBeGreaterThan(0)
          const guideSlug = link.to.match(/^\/guias\/(.+)$/)?.[1]
          if (guideSlug) {
            expect(slugs, `${guide.slug} -> ${link.to}`).toContain(guideSlug)
            expect(guideSlug, `${guide.slug} nao deve linkar para si mesmo`).not.toBe(guide.slug)
          } else {
            expect(link.to, `${guide.slug} link deve ser interno`).toMatch(/^\//)
          }
        }
      }
    }
  })

  it('has exactly one pillar guide, kept out of the cluster grids', () => {
    expect(GUIDES.filter((guide) => guide.pillar)).toHaveLength(1)
    expect(pillarGuide()).toBeDefined()
    expect(guidesByCluster().flatMap((group) => group.guides).some((guide) => guide.pillar)).toBe(false)
  })

  it('groups guides without leaving empty clusters in the hub', () => {
    const groups = guidesByCluster()
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) expect(group.guides.length).toBeGreaterThan(0)
    expect(groups.flatMap((group) => group.guides).length).toBe(GUIDES.filter((guide) => !guide.pillar).length)
  })
})

// Hub editorial de cenários/terrenos para RPG (pilar de conteúdo da linha "Cenários RPG").
// Cobre: slug/metadata/canonical/sitemap/breadcrumb, relação com os produtos de cenário
// reais (Portal, Rochas, Cristais, Árvores, Templo, Kit 6 Ruínas), exclusão de produto
// oculto, ausência de canibalização (não casar produto de criatura só por conter "RPG").
describe('hub de cenários para RPG de mesa', () => {
  const SLUG = 'cenarios-para-rpg-de-mesa'
  const catalog = loadSeedCatalog()
  const haystacks = catalog.map(guideMatchText)
  const guide = GUIDES.find((item) => item.slug === SLUG)!
  const isSceneryTitle = (title: string) => /(portal|templo|kit 6 ru[ií]nas|kit 10 [aá]rvores|kit 10 rochas|kit 10 cristais).*(cen[aá]rio|ru[ií]nas|3d)/i.test(title)
  const leadsFor = (pattern: RegExp) => {
    const product = catalog.find((item) => pattern.test(item.title))!
    return guidesForProduct(guideMatchText(product), haystacks).map((item) => item.slug)
  }

  it('publica o hub com slug único e metadata indexável (canonical/robots/breadcrumb/schema)', () => {
    expect(GUIDE_INDEX.filter((item) => item.slug === SLUG)).toHaveLength(1)
    expect(guide, 'o hub deve existir no corpo dos guias').toBeDefined()

    const meta = metadataForRoute(`/guias/${SLUG}`, '', [])
    expect(meta.canonical).toBe(`${SITE_ORIGIN}/guias/${SLUG}`)
    expect(meta.robots).toBe('index, follow')
    expect(meta.title).toContain('Cenários para RPG de Mesa')
    expect(meta.description.length).toBeGreaterThanOrEqual(100)
    expect(meta.description.length).toBeLessThanOrEqual(160)
    expect(meta.breadcrumbs.map((item) => item.name)).toEqual(['Início', 'Guias', guide.title])
    const types = meta.structuredData.map((item) => item['@type'])
    expect(types).toContain('Article')
    expect(types).toContain('BreadcrumbList')
  })

  it('entra no sitemap', () => {
    expect(sitemapPaths(catalog)).toContain(`/guias/${SLUG}`)
  })

  it('relaciona exatamente os seis produtos de cenário, sem produto irrelevante', () => {
    const matched = productsForGuide(guide, catalog)
    expect(matched).toHaveLength(6)
    expect(matched.every((product) => isSceneryTitle(product.title)), matched.map((p) => p.title).join(' | ')).toBe(true)
    expect(matched.some((product) => /goblin|\borcs?\b|esqueleto|drag[aã]o|vampiro|necromante/i.test(product.title))).toBe(false)
  })

  it('não retorna produto de cenário oculto (respeita visibilidade)', () => {
    const visible = catalog.find((product) => /portal em ru[ií]nas/i.test(product.title))!
    const hidden = { ...visible, id: `${visible.id}-oculto`, slug: `${visible.slug}-oculto`, showOnStorefront: false }
    const matched = productsForGuide(guide, [...catalog, hidden])
    expect(matched.some((product) => product.id === hidden.id)).toBe(false)
  })

  it('faz o hub liderar os produtos de terreno (Portal, Rochas, Cristais, Árvores, Kit 6 Ruínas)', () => {
    for (const pattern of [/portal em ru[ií]nas/i, /kit 10 rochas/i, /kit 10 cristais/i, /kit 10 [aá]rvores/i, /kit 6 ru[ií]nas/i]) {
      expect(leadsFor(pattern)[0], `${pattern} deve liderar o hub de cenários`).toBe(SLUG)
    }
    // Templo Em Ruínas cita mortos-vivos na descrição: o guia de mortos-vivos pode liderar o
    // produto, mas o hub de cenários continua entre os relacionados (top-3) e o puxa como produto.
    expect(leadsFor(/templo em ru[ií]nas/i)).toContain(SLUG)
    expect(productsForGuide(guide, catalog).some((product) => /templo em ru[ií]nas/i.test(product.title))).toBe(true)
  })

  it('não canibaliza: produto de criatura não recebe o hub só por conter "RPG"', () => {
    for (const pattern of [/goblin/i, /\borcs?\b/i, /esqueleto/i, /drag[aã]o/i]) {
      const product = catalog.find((item) => pattern.test(item.title))
      if (!product) continue
      expect(guidesForProduct(guideMatchText(product), haystacks).map((item) => item.slug), `${pattern} não deve receber o hub de cenários`).not.toContain(SLUG)
    }
  })

  it('é a única página cuja intenção principal é cenário/terreno (sem duplicar intenção)', () => {
    const sceneryIntent = GUIDE_INDEX.filter((item) => /^cenarios-para-rpg|terrenos-para-rpg/i.test(item.slug))
    expect(sceneryIntent.map((item) => item.slug)).toEqual([SLUG])
    // Os guias que não devem ser canibalizados seguem existindo com sua intenção própria.
    for (const slug of ['miniaturas-rpg', 'criar-encontros-rpg', 'miniaturas-essenciais-mestre-rpg', 'como-comecar-rpg-de-mesa']) {
      expect(GUIDE_INDEX.some((item) => item.slug === slug), slug).toBe(true)
    }
  })
})
