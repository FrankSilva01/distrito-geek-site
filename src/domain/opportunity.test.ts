import { describe, expect, it } from 'vitest'
import {
  assessSession,
  competitionLevel,
  dataConfidence,
  demandLevel,
  dgFit,
  heatmap,
  isKnown,
  latestSession,
  marketSignals,
  opportunitySchema,
  priceMetrics,
  priceOutlook,
  type Evidence,
  type FitContext,
} from './opportunity'

let seq = 0
const ev = (over: Partial<Evidence>): Evidence => ({
  id: `e${seq++}`, source: 'mercado-livre', url: '', title: '', price: 50, kitQuantity: 1,
  painted: 'desconhecido', reviews: 'unknown', sold: 'unknown', comparability: 'comparavel', collectedAt: '2026-08-12', ...over,
})

const richContext: FitContext = { categoryExists: true, guideExists: true, complementaryProduct: true, rpgFocus: true }

describe('métricas de preço', () => {
  it('calcula min/max/média/mediana só com amostras comparáveis', () => {
    const metrics = priceMetrics([ev({ price: 20 }), ev({ price: 40 }), ev({ price: 90 }), ev({ price: 100, comparability: 'nao-comparavel' })])
    expect(metrics.status).toBe('ok')
    expect(metrics.sampleCount).toBe(3)
    expect(metrics.min).toBe(20)
    expect(metrics.max).toBe(90)
    expect(metrics.median).toBe(40)
    expect(metrics.mean).toBeCloseTo(50)
  })

  it('marca DADOS INSUFICIENTES abaixo do mínimo de amostras', () => {
    const metrics = priceMetrics([ev({ price: 20 }), ev({ price: 40 })])
    expect(metrics.status).toBe('insufficient')
    expect(metrics.sampleCount).toBe(2)
    expect(metrics.median).toBe(0)
  })

  it('normaliza preço por unidade e não mistura avulso com kit', () => {
    // Kit 10 por 100 => 10/un; avulso 1 por 12 => 12/un; kit 5 por 40 => 8/un.
    const metrics = priceMetrics([
      ev({ price: 100, kitQuantity: 10 }),
      ev({ price: 12, kitQuantity: 1 }),
      ev({ price: 40, kitQuantity: 5 }),
    ])
    expect(metrics.unitStatus).toBe('ok')
    expect(metrics.unitSampleCount).toBe(3)
    expect(metrics.unitMedian).toBe(10)
    expect(metrics.unitMin).toBe(8)
    expect(metrics.unitMax).toBe(12)
  })

  it('ignora quantidade desconhecida no preço por unidade (unknown ≠ 1)', () => {
    const metrics = priceMetrics([ev({ price: 100, kitQuantity: 'unknown' }), ev({ price: 90, kitQuantity: 'unknown' }), ev({ price: 80, kitQuantity: 'unknown' })])
    expect(metrics.status).toBe('ok')
    expect(metrics.unitStatus).toBe('insufficient')
    expect(metrics.unitSampleCount).toBe(0)
  })
})

describe('UNKNOWN nunca é zero', () => {
  it('isKnown distingue número de desconhecido', () => {
    expect(isKnown(0)).toBe(true)
    expect(isKnown('unknown')).toBe(false)
  })

  it('vendas/avaliações desconhecidas não contam como sinal', () => {
    const signals = marketSignals([ev({ sold: 'unknown', reviews: 'unknown' }), ev({ sold: 'unknown' }), ev({ sold: 'unknown' })])
    expect(signals.withSales).toBe(0)
    expect(signals.withReviews).toBe(0)
    expect(signals.unknownRatio).toBeGreaterThan(0)
  })

  it('vendas conhecidas (inclusive zero real) são tratadas corretamente', () => {
    const signals = marketSignals([ev({ sold: 5 }), ev({ sold: 0 }), ev({ sold: 12 })])
    // sold=0 é um zero REAL informado — não é sinal de venda, mas também não é unknown.
    expect(signals.withSales).toBe(2)
  })
})

describe('demanda e concorrência', () => {
  it('demanda desconhecida sem amostras comparáveis', () => {
    expect(demandLevel(marketSignals([ev({ comparability: 'nao-comparavel' })]))).toBe('desconhecida')
  })

  it('demanda alta exige sinal de venda/avaliação em múltiplas fontes', () => {
    const signals = marketSignals([ev({ sold: 10 }), ev({ sold: 8, source: 'shopee' }), ev({ sold: 5, source: 'tiktok' })])
    expect(demandLevel(signals)).toBe('alta')
  })

  it('não usa número de anúncios sozinho como demanda alta', () => {
    // 6 ofertas comparáveis, mesma fonte, sem vendas nem avaliações => não é alta.
    const signals = marketSignals(Array.from({ length: 6 }, () => ev({ sold: 'unknown', reviews: 'unknown' })))
    expect(demandLevel(signals)).toBe('baixa')
  })

  it('concorrência alta com muitas ofertas comparáveis', () => {
    expect(competitionLevel(marketSignals(Array.from({ length: 9 }, () => ev({}))))).toBe('alta')
    expect(competitionLevel(marketSignals([ev({}), ev({}), ev({})]))).toBe('media')
    expect(competitionLevel(marketSignals([ev({})]))).toBe('baixa')
  })
})

describe('preço e aderência', () => {
  it('preço favorável quando pretendido fica na mediana ou abaixo', () => {
    const metrics = priceMetrics([ev({ price: 60 }), ev({ price: 80 }), ev({ price: 100 })])
    expect(priceOutlook(metrics, 70, 78)).toBe('favoravel')
    expect(priceOutlook(metrics, 85, 95)).toBe('neutro')
    expect(priceOutlook(metrics, 120, 140)).toBe('apertado')
  })

  it('preço desconhecido sem dados ou sem alvo', () => {
    const metrics = priceMetrics([ev({ price: 60 }), ev({ price: 80 }), ev({ price: 100 })])
    expect(priceOutlook(metrics)).toBe('desconhecido')
    expect(priceOutlook(priceMetrics([ev({ price: 60 })]), 70, 78)).toBe('desconhecido')
  })

  it('aderência sobe com sinais internos objetivos', () => {
    expect(dgFit(richContext)).toBe('alta')
    expect(dgFit({ categoryExists: true, guideExists: true, complementaryProduct: false, rpgFocus: false })).toBe('media')
    expect(dgFit({ categoryExists: false, guideExists: false, complementaryProduct: false, rpgFocus: true })).toBe('baixa')
  })
})

describe('confiança', () => {
  it('inconclusiva com poucas amostras', () => {
    expect(dataConfidence(marketSignals([ev({}), ev({})]))).toBe('inconclusiva')
  })

  it('alta com muitas amostras, fontes e venda pública', () => {
    const signals = marketSignals([
      ...Array.from({ length: 6 }, () => ev({ sold: 4, reviews: 10, kitQuantity: 1 })),
      ev({ sold: 3, reviews: 8, source: 'shopee' }),
      ev({ sold: 2, reviews: 5, source: 'tiktok' }),
    ])
    expect(dataConfidence(signals)).toBe('alta')
  })

  it('média/baixa conforme fontes e amostras', () => {
    expect(dataConfidence(marketSignals([ev({}), ev({ source: 'shopee' }), ev({ source: 'tiktok' })]))).toBe('media')
    expect(dataConfidence(marketSignals([ev({}), ev({}), ev({})]))).toBe('baixa')
  })
})

describe('heatmap', () => {
  it('QUENTE: demanda alta, concorrência baixa, preço favorável, aderência alta', () => {
    expect(heatmap({ demand: 'alta', competition: 'baixa', price: 'favoravel', fit: 'alta', confidence: 'alta' })).toBe('quente')
  })

  it('FRIO: demanda baixa e concorrência alta', () => {
    expect(heatmap({ demand: 'baixa', competition: 'alta', price: 'neutro', fit: 'media', confidence: 'media' })).toBe('frio')
  })

  it('INCONCLUSIVO quando confiança é inconclusiva, mesmo com sinais positivos', () => {
    expect(heatmap({ demand: 'alta', competition: 'baixa', price: 'favoravel', fit: 'alta', confidence: 'inconclusiva' })).toBe('inconclusivo')
  })

  it('confiança BAIXA limita o resultado: nunca QUENTE', () => {
    const heat = heatmap({ demand: 'alta', competition: 'baixa', price: 'favoravel', fit: 'alta', confidence: 'baixa' })
    expect(heat).not.toBe('quente')
    expect(heat).toBe('morno')
  })

  it('demanda ou concorrência desconhecida => INCONCLUSIVO', () => {
    expect(heatmap({ demand: 'desconhecida', competition: 'baixa', price: 'favoravel', fit: 'alta', confidence: 'media' })).toBe('inconclusivo')
  })
})

describe('assessSession (avaliação + explicação obrigatória)', () => {
  it('produz resultado explicável com razões preenchidas', () => {
    const evidences = [
      ev({ price: 70, sold: 10, reviews: 12 }),
      ev({ price: 80, sold: 8, reviews: 9, source: 'shopee' }),
      ev({ price: 90, sold: 5, reviews: 6, source: 'tiktok' }),
    ]
    const assessment = assessSession(evidences, richContext, { min: 70, max: 78 })
    expect(assessment.heat).toBe('quente')
    expect(assessment.reasons.length).toBeGreaterThan(3)
    expect(assessment.reasons.some((reason) => reason.includes('comparável'))).toBe(true)
    expect(assessment.reasons.some((reason) => reason.toLowerCase().includes('mediana'))).toBe(true)
  })

  it('dados fracos => INCONCLUSIVO com explicação de insuficiência', () => {
    const assessment = assessSession([ev({ price: 50, sold: 'unknown', reviews: 'unknown' })], richContext)
    expect(assessment.heat).toBe('inconclusivo')
    expect(assessment.confidence).toBe('inconclusiva')
    expect(assessment.reasons.some((reason) => reason.toLowerCase().includes('insuficiente'))).toBe(true)
  })
})

describe('modelo e histórico', () => {
  it('latestSession devolve a sessão mais recente por data', () => {
    const opportunity = opportunitySchema.parse({
      id: 'op1', name: 'Kit moedas RPG', createdAt: '2026-08-01', updatedAt: '2026-08-12',
      sessions: [
        { id: 's1', date: '2026-07-01', evidences: [] },
        { id: 's2', date: '2026-08-10', evidences: [] },
      ],
    })
    expect(latestSession(opportunity)?.id).toBe('s2')
  })

  it('schema aplica defaults seguros e preserva unknown', () => {
    const opportunity = opportunitySchema.parse({ id: 'op2', name: 'X', createdAt: '2026-08-01', updatedAt: '2026-08-01' })
    expect(opportunity.status).toBe('ideia')
    expect(opportunity.channels).toEqual([])
    expect(opportunity.potentialGuide).toBe(false)
  })
})
