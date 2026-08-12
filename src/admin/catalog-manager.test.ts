import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { guideMatchText } from '../content/guides-index'
import { catalogCategories, emptyFilters, estimateNet, filterProducts, productGuides, productHealth } from './catalog-manager'

const base = loadSeedCatalog()
const haystacks = base.map(guideMatchText)
const filter = (patch: Partial<typeof emptyFilters>) => filterProducts(base, { ...emptyFilters, ...patch }, haystacks)

describe('catálogo admin — filtros e busca', () => {
  it('busca por nome, SKU, id externo, categoria e termos', () => {
    expect(filter({ query: 'goblin' }).length).toBeGreaterThan(0)
    expect(filter({ query: 'goblin' }).every((p) => /goblin/i.test(`${p.title} ${p.category} ${(p.seoTags || []).join(' ')}`))).toBe(true)
    const withListing = base.find((p) => p.listings[0])!
    expect(filter({ query: withListing.listings[0].externalId }).some((p) => p.id === withListing.id)).toBe(true)
    expect(filter({ query: 'zzz-nao-existe' })).toEqual([])
  })

  it('filtra por visibilidade (oculto e fora-da-home)', () => {
    const hidden = base.map((p) => (/goblin/i.test(p.title) ? { ...p, showOnStorefront: false } : p))
    const oc = filterProducts(hidden, { ...emptyFilters, visibility: 'ocultos' }, haystacks)
    expect(oc.some((p) => /goblin/i.test(p.title))).toBe(true)
    expect(filterProducts(hidden, { ...emptyFilters, visibility: 'publicados' }, haystacks).some((p) => /goblin/i.test(p.title))).toBe(false)

    const homeHidden = base.map((p) => (/goblin/i.test(p.title) ? { ...p, showOnHome: false } : p))
    const fora = filterProducts(homeHidden, { ...emptyFilters, visibility: 'fora-home' }, haystacks)
    expect(fora.some((p) => /goblin/i.test(p.title))).toBe(true)
  })

  it('filtra por conteúdo (sem descrição própria, sem guia)', () => {
    // No seed nenhum produto tem storefrontDescription → todos entram em "sem-descricao".
    expect(filter({ content: 'sem-descricao' }).length).toBe(base.length)
    const semGuia = filter({ content: 'sem-guia' })
    expect(semGuia.every((p) => !productGuides(p, haystacks).specific)).toBe(true)
  })

  it('filtra por canal e categoria reais', () => {
    expect(filter({ channel: 'mercado-livre' }).every((p) => p.listings.some((l) => l.marketplace === 'mercado-livre'))).toBe(true)
    const cats = catalogCategories(base)
    expect(cats).toContain('miniaturas-rpg')
    expect(filter({ category: 'miniaturas-rpg' }).every((p) => p.category === 'miniaturas-rpg')).toBe(true)
  })
})

describe('catálogo admin — saúde do produto', () => {
  it('reporta OK/pendente/atenção sem score numérico', () => {
    const goblin = base.find((p) => /goblin/i.test(p.title))!
    const groups = productHealth(goblin, true)
    expect(groups.map((g) => g.group)).toEqual(['Publicação', 'Conteúdo', 'SEO', 'Canais'])
    const states = groups.flatMap((g) => g.items.map((i) => i.state))
    expect(states.every((s) => ['ok', 'pendente', 'atencao'].includes(s))).toBe(true)
    // Produto publicado com imagem/preço/categoria → publicação OK.
    expect(groups[0].items.find((i) => i.label === 'Imagem')!.state).toBe('ok')
    // Sem descrição própria no seed → conteúdo pendente.
    expect(groups[1].items.find((i) => i.label === 'Descrição própria')!.state).toBe('pendente')
    // Sem canal Shopee → pendente (não "atenção").
    expect(groups[3].items.find((i) => i.label === 'Shopee')!.state).toBe('pendente')
  })

  it('marca produto oculto como atenção na publicação', () => {
    const hidden = { ...base.find((p) => /goblin/i.test(p.title))!, showOnStorefront: false }
    expect(productHealth(hidden, true)[0].items[0].state).toBe('atencao')
  })
})

describe('catálogo admin — simulador de preço', () => {
  it('calcula líquido = bruto - %taxa - fixa - outros, sem taxas negativas', () => {
    expect(estimateNet({ price: 100, percentFee: 12, fixedFee: 6, otherCosts: 2 })).toEqual({ gross: 100, percentAmount: 12, fixedFee: 6, otherCosts: 2, net: 80 })
    expect(estimateNet({ price: 50, percentFee: 0, fixedFee: 0, otherCosts: 0 }).net).toBe(50)
    // valores negativos são tratados como zero
    expect(estimateNet({ price: 100, percentFee: -5, fixedFee: -1, otherCosts: -3 }).net).toBe(100)
  })
})
