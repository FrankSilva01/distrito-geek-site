import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { buildCommercialInsights, COMMERCIAL_MIN_PRODUCT_VIEWS } from './commercial-insights'

describe('commercial insights', () => {
  const [base] = loadSeedCatalog()
  const product = (id: string, slug: string, listings = base.listings) => ({ ...base, id, slug, sku: `DG-MIN-${id.padStart(6, '0')}`, listings })

  it('calcula o funil e o CTR comercial sem chamar clique de venda', () => {
    const result = buildCommercialInsights(
      [product('1', 'kit-mortos-vivos')],
      [{ path: '/produto/kit-mortos-vivos', title: 'Kit Mortos-vivos', views: 120, users: 90, mercadoLivreClicks: 20, shopeeClicks: 5, tiktokClicks: 3, whatsappClicks: 2 }],
    )

    expect(result.funnel).toEqual({ productViews: 120, commercialClicks: 30, commercialCtr: 0.25 })
    expect(result.products[0]).toMatchObject({ totalCommercialClicks: 30, commercialCtr: 0.25, status: 'BOM INTERESSE' })
  })

  it('mantém pouca amostra e ausência de dados distintas de baixo clique', () => {
    const lowSample = buildCommercialInsights(
      [product('1', 'produto-um'), product('2', 'produto-dois')],
      [{ path: '/produto/produto-um', title: 'Produto um', views: COMMERCIAL_MIN_PRODUCT_VIEWS - 1, users: 2, mercadoLivreClicks: 0, shopeeClicks: 0, tiktokClicks: 0, whatsappClicks: 0 }],
    )

    expect(lowSample.products.find((item) => item.slug === 'produto-um')?.status).toBe('POUCOS DADOS')
    expect(lowSample.products.find((item) => item.slug === 'produto-dois')?.status).toBe('SEM DADOS')
  })

  it('classifica baixo clique somente depois da amostra mínima', () => {
    const result = buildCommercialInsights(
      [product('1', 'produto-um')],
      [{ path: '/produto/produto-um', title: 'Produto um', views: COMMERCIAL_MIN_PRODUCT_VIEWS, users: 8, mercadoLivreClicks: 0, shopeeClicks: 0, tiktokClicks: 0, whatsappClicks: 0 }],
    )

    expect(result.products[0].status).toBe('BAIXO CLIQUE')
    expect(result.products[0].diagnostics).toContain('Recebeu visualizações suficientes, mas ainda não registrou clique comercial.')
  })

  // O caso real DG-MIN-000038 "Miniatura De Orcs": descrição de 17 caracteres vinda do
  // marketplace, curta demais para `canPublishProduct`. O produto some da vitrine mas continua
  // marcado como publicado, e por isso vive em ATENÇÃO. Tirar da vitrine é o que resolve —
  // inventar descrição só para passar no limite, não.
  it('marca ATENÇÃO quando a descrição do marketplace é curta demais para publicar', () => {
    const curto = { ...product('38', 'miniatura-de-orcs'), description: 'Miniatura de orcs' }
    const result = buildCommercialInsights([curto], [])

    expect(result.products[0].status).toBe('ATENÇÃO')
    expect(result.products[0].missingRequirements).toContain('descrição')
    expect(result.products[0].coverage.distritoGeek).toBe('Atenção')

    // Fora da vitrine ele deixa de ser cobrado como produto público, e o alerta some.
    const oculto = buildCommercialInsights([{ ...curto, showOnStorefront: false }], [])
    expect(oculto.products).toHaveLength(0)
    expect(oculto.attentionProducts).toHaveLength(0)
  })
  it('separa WhatsApp dos marketplaces e encontra produto público sem saída comercial', () => {
    const noChannel = product('1', 'sem-canal', [])
    const withChannel = product('2', 'com-canal')
    const result = buildCommercialInsights([noChannel, withChannel], [])

    expect(result.products[0].status).toBe('SEM CTA')
    expect(result.uncoveredProducts).toHaveLength(1)
    expect(result.channels.find((item) => item.channel === 'whatsapp')).toMatchObject({ kind: 'auxiliar', productsWithLink: 1 })
  })

  it('distingue anúncio ausente de anúncio com URL inválida', () => {
    const invalidUrl = product('1', 'url-invalida', [{ marketplace: 'mercado-livre' as const, externalId: 'MLB1', url: '', active: true }])
    const result = buildCommercialInsights([invalidUrl], [])

    expect(result.products[0].coverage.mercadoLivre.status).toBe('URL ausente')
    expect(result.products[0].diagnostics).toContain('Produto possui canal associado, mas a URL de compra está ausente ou inválida.')
    expect(result.uncoveredProducts).toHaveLength(1)
  })

  it('agrega interesse por família apenas a partir da curadoria explícita', () => {
    const goblin = { ...base, id: 'MLB4866664485', slug: 'goblin-real' }
    const result = buildCommercialInsights(
      [goblin],
      [{ path: '/produto/goblin-real', title: 'Goblin', views: 20, users: 12, mercadoLivreClicks: 4, shopeeClicks: 0, tiktokClicks: 0, whatsappClicks: 0 }],
    )

    expect(result.families).toContainEqual(expect.objectContaining({ family: 'Goblins', views: 20, commercialClicks: 4, commercialCtr: 0.2 }))
  })
})
