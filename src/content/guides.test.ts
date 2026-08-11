import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
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
