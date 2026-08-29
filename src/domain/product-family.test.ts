import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CURATED_PRODUCT_FAMILIES, familyForProduct, productFamilySchema, productRelationSchema, relatedProductsFor, type ProductFamily } from './product-family'
import type { Product } from './product'

const product = (id: string, status: Product['status'] = 'published'): Product => ({
  id, slug: id.toLowerCase(), title: `Produto ${id} completo`, description: 'Descrição suficiente para publicação do produto.',
  price: 89.9, currency: 'BRL', stock: 2, status, category: 'miniaturas-rpg', images: ['/produto.webp'],
  attributes: {}, featured: false, showOnStorefront: true, listings: [{ marketplace: 'mercado-livre', externalId: id, url: `https://produto.mercadolivre.com.br/${id}`, active: true }],
  version: 1, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
})

const family: ProductFamily = {
  id: 'familia-orcs', name: 'Orcs', slug: 'orcs', shortDescription: 'Miniaturas de Orcs para encontros de RPG.',
  productIds: ['ORC-1', 'ORC-2'], priority: 10, published: true,
}

const KIT12 = 'MLB7487608286'
const KIT5 = 'MLB7488354880'
const CRIATURAS = 'MLB7492964436'

describe('product families and commercial relations', () => {
  it('curates the six real RPG scenery products as one bidirectional family', () => {
    const scenery = CURATED_PRODUCT_FAMILIES.find((candidate) => candidate.id === 'family-cenarios-rpg')

    expect(scenery).toMatchObject({
      name: 'Cenários RPG',
      slug: 'cenarios-rpg',
      productIds: ['MLB7451208354', 'MLB7451226704', 'MLB5071806599', 'MLB7462237046', 'MLB7426771372', 'MLB7427034982'],
      published: true,
    })

    // Árvores entrou na família: o Admin reportava a peça como fora de curadoria.
    expect(familyForProduct('MLB5071806599', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')
    expect(familyForProduct('MLB7451226704', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')
    expect(familyForProduct('MLB7451208354', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')
    expect(familyForProduct('MLB7462237046', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-cenarios-rpg')

    const temple = product('MLB7426771372')
    const ruins = product('MLB7427034982')
    expect(relatedProductsFor(temple, [temple, ruins], CURATED_PRODUCT_FAMILIES)).toEqual([
      { product: ruins, relation: { productId: ruins.id, type: 'mesma-familia', priority: 104 } },
    ])
    expect(relatedProductsFor(ruins, [temple, ruins], CURATED_PRODUCT_FAMILIES)).toEqual([
      { product: temple, relation: { productId: temple.id, type: 'mesma-familia', priority: 104 } },
    ])
  })

  it('orders scenery cross-sell so rocks lead crystals and trees, and rocks lead with crystals', () => {
    const rocks = product('MLB7451208354')
    const crystals = product('MLB7451226704')
    const trees = product('MLB5071806599')
    const portal = product('MLB7462237046')
    const temple = product('MLB7426771372')
    const catalog = [rocks, crystals, trees, portal, temple]

    const first = (item: Product) => relatedProductsFor(item, catalog, CURATED_PRODUCT_FAMILIES).map((entry) => entry.product.id)
    expect(first(crystals)[0]).toBe(rocks.id)
    expect(first(rocks).slice(0, 2)).toEqual([crystals.id, trees.id])
    expect(first(trees)[0]).toBe(rocks.id)
    // O portal não desloca as prioridades dos três kits: entra depois deles.
    expect(first(crystals).slice(0, 3)).toEqual([rocks.id, trees.id, portal.id])
  })

  it('keeps the live orc kit inside the curated orcs family', () => {
    expect(familyForProduct('MLB7400799166', CURATED_PRODUCT_FAMILIES)?.id).toBe('family-orcs')
  })

  // Os SKUs DG são a identidade estável do catálogo; o mapeamento para o id interno usado na
  // curadoria está aqui para o teste falhar se algum produto trocar de família por engano.
  it('anchors every recently synced product to the family its DG SKU belongs to', () => {
    const esperado: Array<[string, string, string]> = [
      ['DG-MIN-000048', 'MLB7451208354', 'family-cenarios-rpg'], // Kit 10 Rochas
      ['DG-MIN-000049', 'MLB7451226704', 'family-cenarios-rpg'], // Kit 10 Cristais Mágicos
      ['DG-MIN-000050', 'MLB7462237046', 'family-cenarios-rpg'], // Portal em Ruínas
      ['DG-MIN-000051', 'MLB5096680875', 'family-goblins'], //     Kit 5 Goblins Aventureiros
      ['DG-MIN-000047', 'MLB5071806599', 'family-cenarios-rpg'], // Kit 10 Árvores
      ['DG-MIN-000044', 'MLB7400799166', 'family-orcs'], //         Kit 4 Orcs
    ]
    for (const [sku, id, familyId] of esperado) {
      expect(familyForProduct(id, CURATED_PRODUCT_FAMILIES)?.id, sku).toBe(familyId)
    }
  })

  it('holds the three demon kits in one Demônios family and creates no sibling variant family', () => {
    const demonios = CURATED_PRODUCT_FAMILIES.find((family) => family.id === 'family-demonios')
    expect(demonios).toMatchObject({ name: 'Demônios', slug: 'demonios', productIds: [KIT12, KIT5, CRIATURAS], published: true })
    expect(familyForProduct(KIT12, CURATED_PRODUCT_FAMILIES)?.id).toBe('family-demonios')
    expect(familyForProduct(KIT5, CURATED_PRODUCT_FAMILIES)?.id).toBe('family-demonios')
    expect(familyForProduct(CRIATURAS, CURATED_PRODUCT_FAMILIES)?.id).toBe('family-demonios')

    // Nenhum dos três pode ter caído em outra família, e não existe "Pacto Infernal",
    // "Criaturas Demoníacas", "Demônios 32mm" nem variante parecida.
    const outras = CURATED_PRODUCT_FAMILIES.filter((family) => family.id !== 'family-demonios')
    for (const id of [KIT12, KIT5, CRIATURAS]) {
      expect(outras.some((family) => family.productIds.includes(id)), id).toBe(false)
    }
    expect(CURATED_PRODUCT_FAMILIES.filter((family) => /demonio|pacto|infernal|criaturas-demoniacas/i.test(family.slug))).toHaveLength(1)

    // Sem relação explícita, a família sozinha já devolve os outros dois, na ordem da lista.
    const doze = { ...product(KIT12), title: 'Kit 12 Demônios RPG' }
    const cinco = { ...product(KIT5), title: 'Kit 5 Demônios RPG' }
    const criaturas = { ...product(CRIATURAS), title: 'Kit 5 Criaturas Demoníacas RPG' }
    const trio = [doze, cinco, criaturas]
    expect(relatedProductsFor(doze, trio, CURATED_PRODUCT_FAMILIES).map((e) => e.product.id)).toEqual([KIT5, CRIATURAS])
    expect(relatedProductsFor(cinco, trio, CURATED_PRODUCT_FAMILIES).map((e) => e.product.id)).toEqual([KIT12, CRIATURAS])
    expect(relatedProductsFor(criaturas, trio, CURATED_PRODUCT_FAMILIES).map((e) => e.product.id)).toEqual([KIT12, KIT5])
  })

  // Os nove ids do cross-sell dos demônios foram escritos à mão em scripts/seo-overrides.json.
  // Um id trocado ali não quebraria nada em runtime: `relatedProductsFor` simplesmente
  // descartaria a relação em silêncio, e o produto ficaria sem cross-sell sem ninguém notar.
  it('keeps the demon cross-sell pointing at products that really exist in curated families', () => {
    const overrides = JSON.parse(readFileSync('scripts/seo-overrides.json', 'utf8')) as Record<string, { relatedProducts?: Array<{ productId: string; type: string; priority: number }> }>
    const curados = new Set(CURATED_PRODUCT_FAMILIES.flatMap((family) => family.productIds))

    for (const id of [KIT12, KIT5, CRIATURAS]) {
      const relacoes = overrides[id]?.relatedProducts
      expect(relacoes, `${id} precisa de cross-sell editorial`).toBeDefined()
      for (const relacao of relacoes!) {
        expect(relacao.productId, `${id} → ${relacao.productId} não está em nenhuma família curada`).toSatisfy((alvo: string) => curados.has(alvo))
        expect(productRelationSchema.parse(relacao)).toMatchObject({ productId: relacao.productId })
      }
      // Prioridades sem empate, senão a ordem do bloco fica indefinida.
      expect(new Set(relacoes!.map((relacao) => relacao.priority)).size, id).toBe(relacoes!.length)
      expect(relacoes!.map((relacao) => relacao.productId), `${id} não pode se relacionar consigo`).not.toContain(id)
    }
  })

  // A relação explícita é filtrada ANTES da de família em `relatedProductsFor`, então é ela que
  // garante o irmão em primeiro lugar. Sem isso o cenário passaria à frente do outro kit.
  it('puts both sibling demon kits first on all three sides, then scenery, then a dark creature', () => {
    const overrides = JSON.parse(readFileSync('scripts/seo-overrides.json', 'utf8')) as Record<string, { relatedProducts?: Array<{ productId: string; type: string; priority: number }> }>
    // Título com 8+ caracteres: `canPublishProduct` reprova abaixo disso e a relação seria descartada.
    const nomes: Record<string, string> = {
      [KIT12]: 'Kit 12 Demônios RPG', [KIT5]: 'Kit 5 Demônios RPG', [CRIATURAS]: 'Kit 5 Criaturas Demoníacas RPG',
      MLB7462237046: 'Portal em Ruínas RPG',
      MLB7451226704: 'Kit 10 Cristais RPG', MLB6830402558: 'Miniaturas Necromantes', MLB7427034982: 'Kit 6 Ruínas RPG',
      MLB7426771372: 'Templo em Ruínas RPG', MLB7105512392: 'Kit Mortos-vivos RPG', MLB4704692617: 'Miniaturas Vampiros',
    }
    const catalogo = Object.entries(nomes).map(([id, titulo]) => ({ ...product(id), title: titulo }))

    // Cada kit e a ordem dos dois irmãos que ele deve puxar antes de qualquer cenário.
    for (const [id, ...esperados] of [[KIT12, KIT5, CRIATURAS], [KIT5, KIT12, CRIATURAS], [CRIATURAS, KIT5, KIT12]] as const) {
      // Passa pelo schema para estreitar o `type` que vem do JSON como string solta.
      const relacoes = overrides[id]!.relatedProducts!.map((relacao) => productRelationSchema.parse(relacao))
      const alvo = { ...product(id), title: nomes[id], relatedProducts: relacoes }
      const ordem = relatedProductsFor(alvo, catalogo, CURATED_PRODUCT_FAMILIES).map((entry) => entry.product.id)
      expect(ordem.slice(0, 2), `${id} tem de puxar os dois irmãos primeiro`).toEqual(esperados)
      // Os quatro visíveis na ProductPage misturam família e cenário, em vez de quatro ruínas seguidas.
      expect(ordem.slice(0, 4), id).toEqual([...esperados, 'MLB7462237046', 'MLB7451226704'])
      // A relação de família não pode duplicar os irmãos que a relação explícita já trouxe.
      for (const irmao of esperados) expect(ordem.filter((entrada) => entrada === irmao), irmao).toHaveLength(1)
    }
  })

  // A família nasce com um produto só, e é assim que ela tem de se comportar: existir na
  // curadoria, resolver o id real e não inventar relação de família consigo mesma.
  it('creates the Criaturas Bestiais family without calling it Licantropos', () => {
    const BESTIAIS = 'MLB7546463124'
    const familia = CURATED_PRODUCT_FAMILIES.find((family) => family.id === 'family-criaturas-bestiais')
    expect(familia).toMatchObject({ name: 'Criaturas Bestiais', slug: 'criaturas-bestiais', productIds: [BESTIAIS], published: true })
    expect(familyForProduct(BESTIAIS, CURATED_PRODUCT_FAMILIES)?.id).toBe('family-criaturas-bestiais')

    // O produto não pode ter caído em Demônios, Mortos-vivos, Orcs nem numa família "Licantropos".
    for (const family of CURATED_PRODUCT_FAMILIES.filter((f) => f.id !== 'family-criaturas-bestiais')) {
      expect(family.productIds, family.id).not.toContain(BESTIAIS)
    }
    expect(CURATED_PRODUCT_FAMILIES.filter((family) => /licantropo|lobisomem/i.test(family.slug + family.name))).toHaveLength(0)

    // Família de um membro só não gera relação de família: o cross-sell tem de vir do editorial.
    const sozinho = { ...product(BESTIAIS), title: 'Kit 9 Criaturas Bestiais RPG' }
    expect(relatedProductsFor(sozinho, [sozinho], CURATED_PRODUCT_FAMILIES)).toEqual([])
  })

  // Os dez ids do cross-sell foram escritos à mão no seo-overrides.json. Um id errado ali não
  // quebra runtime — a relação é descartada em silêncio e o produto fica sem cross-sell.
  it('keeps the bestial cross-sell pointing at products that really exist, in the briefed order', () => {
    const BESTIAIS = 'MLB7546463124'
    const overrides = JSON.parse(readFileSync('scripts/seo-overrides.json', 'utf8')) as Record<string, { relatedProducts?: Array<{ productId: string; type: string; priority: number }> }>
    const relacoes = overrides[BESTIAIS]?.relatedProducts
    expect(relacoes, 'cross-sell editorial ausente').toBeDefined()
    const curados = new Set(CURATED_PRODUCT_FAMILIES.flatMap((family) => family.productIds))
    for (const relacao of relacoes!) {
      expect(relacao.productId, `${relacao.productId} nao esta em familia curada`).toSatisfy((alvo: string) => curados.has(alvo))
      expect(productRelationSchema.parse(relacao)).toMatchObject({ productId: relacao.productId })
    }
    expect(relacoes!.map((r) => r.productId), 'nao pode se relacionar consigo').not.toContain(BESTIAIS)
    expect(new Set(relacoes!.map((r) => r.priority)).size, 'prioridade empatada deixa a ordem indefinida').toBe(relacoes!.length)

    // Ordem do briefing: Demônios, Mortos-vivos, Vampiros, Orcs e só então cenário.
    const nomes: Record<string, string> = {
      MLB7487608286: 'Kit 12 Demônios RPG', MLB7488354880: 'Kit 5 Demônios RPG', MLB7105512392: 'Kit Mortos-vivos RPG',
      MLB4704692617: 'Miniaturas Vampiros', MLB7400799166: 'Kit 4 Orcs RPG', MLB5071806599: 'Kit 10 Árvores RPG',
      MLB7427034982: 'Kit 6 Ruínas RPG', MLB7462237046: 'Portal em Ruínas RPG', MLB7426771372: 'Templo em Ruínas RPG',
      MLB7451208354: 'Kit 10 Rochas RPG',
    }
    const catalogo = Object.entries(nomes).map(([id, titulo]) => ({ ...product(id), title: titulo }))
    const oculto = { ...product('MLB7451208354'), title: nomes.MLB7451208354, showOnStorefront: false }
    const alvo = { ...product(BESTIAIS), title: 'Kit 9 Criaturas Bestiais RPG', relatedProducts: relacoes!.map((r) => productRelationSchema.parse(r)) }
    const ordem = relatedProductsFor(alvo, [...catalogo.filter((p) => p.id !== oculto.id), oculto], CURATED_PRODUCT_FAMILIES).map((e) => e.product.id)
    expect(ordem.slice(0, 4)).toEqual(['MLB7487608286', 'MLB7488354880', 'MLB7105512392', 'MLB4704692617'])
    expect(ordem, 'produto oculto nao pode aparecer no cross-sell').not.toContain('MLB7451208354')
  })

  it('curates by stable identifier only, never by title, and adds no stray family', () => {
    // Se alguém trocar a curadoria por casamento de título, este teste cai.
    for (const family of CURATED_PRODUCT_FAMILIES) {
      for (const productId of family.productIds) {
        expect(productId, `${family.id} → ${productId}`).toMatch(/^MLB\d+$/)
      }
    }
    // Nenhuma família nova: "Goblins Aventureiros" e afins não devem existir.
    expect(CURATED_PRODUCT_FAMILIES.map((family) => family.id).sort()).toEqual([
      'family-aventureiros', 'family-cenarios-rpg', 'family-criaturas-bestiais', 'family-demonios',
      'family-goblins', 'family-mortos-vivos', 'family-necromantes', 'family-orcs', 'family-vampiros',
    ])
  })

  it('never surfaces a hidden product as a family relation', () => {
    const rocks = product('MLB7451208354')
    const crystals = product('MLB7451226704')
    const hiddenPortal = product('MLB7462237046')
    hiddenPortal.showOnStorefront = false
    const pausedTemple = product('MLB7426771372', 'paused')

    const ids = relatedProductsFor(rocks, [rocks, crystals, hiddenPortal, pausedTemple], CURATED_PRODUCT_FAMILIES)
      .map((entry) => entry.product.id)
    expect(ids).toEqual([crystals.id])
  })

  it('validates an explicitly curated family without keyword inference', () => {
    expect(productFamilySchema.parse(family)).toEqual(family)
    expect(familyForProduct('ORC-2', [family])?.slug).toBe('orcs')
    expect(familyForProduct('ORC-3', [family])).toBeUndefined()
  })

  it('shows only public valid related products in editorial order', () => {
    const current = product('ORC-1')
    current.relatedProducts = [
      { productId: 'ORC-3', type: 'alternativa', priority: 30 },
      { productId: 'ORC-2', type: 'complete-o-encontro', priority: 10 },
      { productId: 'ORC-HIDDEN', type: 'combina-com', priority: 20 },
    ]
    const result = relatedProductsFor(current, [current, product('ORC-2'), product('ORC-3'), product('ORC-HIDDEN', 'paused')])
    expect(result.map((item) => item.product.id)).toEqual(['ORC-2', 'ORC-3'])
    expect(result[0].relation.type).toBe('complete-o-encontro')
  })

  it('rejects duplicate/self relations through normalization', () => {
    const current = product('ORC-1')
    current.relatedProducts = [
      { productId: 'ORC-1', type: 'combina-com', priority: 1 },
      { productId: 'ORC-2', type: 'combina-com', priority: 2 },
      { productId: 'ORC-2', type: 'alternativa', priority: 3 },
    ]
    expect(relatedProductsFor(current, [current, product('ORC-2')])).toHaveLength(1)
  })
})
