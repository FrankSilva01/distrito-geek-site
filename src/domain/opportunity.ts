import { z } from 'zod'

/**
 * Radar de Oportunidades — motor determinístico e auditável. Nenhuma IA, nenhum score mágico:
 * o resultado (QUENTE/MORNO/FRIO/INCONCLUSIVO) e a confiança saem de regras explícitas sobre
 * as evidências cadastradas manualmente, e vêm sempre acompanhados do "por quê".
 *
 * REGRA CRÍTICA: ausência de dado é `'unknown'`, NUNCA 0. Um anúncio sem número de vendas não
 * é um anúncio com zero vendas — ele simplesmente não informa. O mesmo vale para avaliações,
 * quantidade no kit, escala e material.
 */

/** Valor numérico OU desconhecido. `'unknown'` jamais deve ser tratado como 0 nos cálculos. */
export const unknownNumber = z.union([z.number(), z.literal('unknown')])
export type UnknownNumber = number | 'unknown'
export const isKnown = (value: UnknownNumber): value is number => value !== 'unknown' && Number.isFinite(value)

export const opportunityStatusSchema = z.enum(['ideia', 'em-analise', 'testar', 'aprovado', 'descartado', 'cadastrado'])
export const opportunityTypeSchema = z.enum(['miniatura', 'kit', 'acessorio', 'cenario', 'outro'])
export const commercialFormatSchema = z.enum(['avulso', 'kit', 'bundle', 'complemento', 'premium', 'indefinido'])
export const opportunityChannelSchema = z.enum(['mercado-livre', 'shopee', 'tiktok', 'distrito-geek'])
export const evidenceSourceSchema = z.enum(['mercado-livre', 'shopee', 'tiktok', 'loja-especializada', 'google', 'outra'])
export const comparabilitySchema = z.enum(['comparavel', 'parcial', 'nao-comparavel'])
export const paintedSchema = z.enum(['pintado', 'nao-pintado', 'desconhecido'])

export const evidenceSchema = z.object({
  id: z.string().min(1),
  source: evidenceSourceSchema,
  url: z.string().trim().default(''),
  title: z.string().trim().default(''),
  price: unknownNumber.default('unknown'),
  kitQuantity: unknownNumber.default('unknown'),
  scale: z.string().trim().optional(),
  material: z.string().trim().optional(),
  painted: paintedSchema.default('desconhecido'),
  reviews: unknownNumber.default('unknown'),
  sold: unknownNumber.default('unknown'),
  comparability: comparabilitySchema.default('comparavel'),
  comparabilityReason: z.string().trim().optional(),
  note: z.string().trim().optional(),
  collectedAt: z.string(),
})
export type Evidence = z.infer<typeof evidenceSchema>

export const researchSessionSchema = z.object({
  id: z.string().min(1),
  date: z.string(),
  terms: z.array(z.string().trim().min(1)).default([]),
  sources: z.array(evidenceSourceSchema).default([]),
  evidences: z.array(evidenceSchema).default([]),
  notes: z.string().trim().optional(),
})
export type ResearchSession = z.infer<typeof researchSessionSchema>

export const opportunitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  category: z.string().trim().default(''),
  type: opportunityTypeSchema.default('outro'),
  format: commercialFormatSchema.default('indefinido'),
  description: z.string().trim().optional(),
  imageRef: z.string().trim().optional(),
  status: opportunityStatusSchema.default('ideia'),
  guideSlug: z.string().trim().optional(),
  potentialGuide: z.boolean().default(false),
  channels: z.array(opportunityChannelSchema).default([]),
  targetPriceMin: z.number().nonnegative().optional(),
  targetPriceMax: z.number().nonnegative().optional(),
  notes: z.string().trim().optional(),
  linkedProductId: z.string().trim().optional(),
  sessions: z.array(researchSessionSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Opportunity = z.infer<typeof opportunitySchema>

// ————————————————————————— MÉTRICAS DE PREÇO —————————————————————————
export const MIN_SAMPLES = 3
export type Level = 'alta' | 'media' | 'baixa' | 'desconhecida'
export type PriceOutlook = 'favoravel' | 'neutro' | 'apertado' | 'desconhecido'
export type Fit = 'alta' | 'media' | 'baixa'
export type Confidence = 'alta' | 'media' | 'baixa' | 'inconclusiva'
export type Heat = 'quente' | 'morno' | 'frio' | 'inconclusivo'

export type PriceMetrics = {
  status: 'ok' | 'insufficient'
  sampleCount: number
  min: number; max: number; mean: number; median: number
  unitStatus: 'ok' | 'insufficient'
  unitSampleCount: number
  unitMin: number; unitMax: number; unitMedian: number
}

const median = (values: number[]): number => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

/** Só amostras COMPARÁVEIS entram no cálculo principal. Preço por unidade só quando a
 *  quantidade do kit é conhecida — nunca misturamos avulso e kit sem normalizar. */
export function priceMetrics(evidences: Evidence[]): PriceMetrics {
  const comparable = evidences.filter((evidence) => evidence.comparability === 'comparavel' && isKnown(evidence.price))
  const prices = comparable.map((evidence) => evidence.price as number)
  const unitPrices = comparable
    .filter((evidence) => isKnown(evidence.kitQuantity) && (evidence.kitQuantity as number) > 0)
    .map((evidence) => (evidence.price as number) / (evidence.kitQuantity as number))
  const enough = prices.length >= MIN_SAMPLES
  const unitEnough = unitPrices.length >= MIN_SAMPLES
  return {
    status: enough ? 'ok' : 'insufficient',
    sampleCount: prices.length,
    min: enough ? Math.min(...prices) : 0,
    max: enough ? Math.max(...prices) : 0,
    mean: enough ? mean(prices) : 0,
    median: enough ? median(prices) : 0,
    unitStatus: unitEnough ? 'ok' : 'insufficient',
    unitSampleCount: unitPrices.length,
    unitMin: unitEnough ? Math.min(...unitPrices) : 0,
    unitMax: unitEnough ? Math.max(...unitPrices) : 0,
    unitMedian: unitEnough ? median(unitPrices) : 0,
  }
}

// ————————————————————————— SINAIS DE MERCADO —————————————————————————
export type MarketSignals = {
  comparableCount: number
  sourcesCount: number
  withReviews: number
  withSales: number
  unknownRatio: number
}

export function marketSignals(evidences: Evidence[]): MarketSignals {
  const comparable = evidences.filter((evidence) => evidence.comparability === 'comparavel')
  const withReviews = comparable.filter((evidence) => isKnown(evidence.reviews) && (evidence.reviews as number) > 0).length
  const withSales = comparable.filter((evidence) => isKnown(evidence.sold) && (evidence.sold as number) > 0).length
  const unknownFields = comparable.flatMap((evidence) => [evidence.price, evidence.sold, evidence.reviews, evidence.kitQuantity])
  const unknownRatio = unknownFields.length ? unknownFields.filter((value) => !isKnown(value)).length / unknownFields.length : 1
  return {
    comparableCount: comparable.length,
    sourcesCount: new Set(comparable.map((evidence) => evidence.source)).size,
    withReviews,
    withSales,
    unknownRatio,
  }
}

/** Demanda: nunca por número de anúncios sozinho — exige sinal de venda/avaliação/multi-fonte. */
export function demandLevel(signals: MarketSignals): Level {
  if (signals.comparableCount === 0) return 'desconhecida'
  if (signals.withSales >= 3 || (signals.withReviews >= 5 && signals.sourcesCount >= 2)) return 'alta'
  if (signals.withSales >= 1 || signals.withReviews >= 2 || signals.sourcesCount >= 2) return 'media'
  return 'baixa'
}

/** Concorrência: quantidade de ofertas comparáveis + fontes distintas. */
export function competitionLevel(signals: MarketSignals): Level {
  if (signals.comparableCount === 0) return 'desconhecida'
  if (signals.comparableCount >= 8 || signals.sourcesCount >= 5) return 'alta'
  if (signals.comparableCount >= 3 || signals.sourcesCount >= 2) return 'media'
  return 'baixa'
}

/** Preço: compara o preço pretendido com a mediana/faixa de mercado. Sem custo de produção. */
export function priceOutlook(metrics: PriceMetrics, targetMin?: number, targetMax?: number): PriceOutlook {
  if (metrics.status !== 'ok' || targetMin === undefined || targetMax === undefined) return 'desconhecido'
  const target = (targetMin + targetMax) / 2
  if (target <= metrics.median) return 'favoravel'
  if (target > metrics.max) return 'apertado'
  return 'neutro'
}

export type FitContext = { categoryExists: boolean; guideExists: boolean; complementaryProduct: boolean; rpgFocus: boolean }
export function dgFit(context: FitContext): Fit {
  const positives = [context.categoryExists, context.guideExists, context.complementaryProduct, context.rpgFocus].filter(Boolean).length
  if (positives >= 3) return 'alta'
  if (positives === 2) return 'media'
  return 'baixa'
}

/** Confiança: quantidade de amostras válidas, fontes, sinal público de venda e % de campos unknown. */
export function dataConfidence(signals: MarketSignals): Confidence {
  if (signals.comparableCount < MIN_SAMPLES || signals.sourcesCount < 1) return 'inconclusiva'
  if (signals.comparableCount >= 8 && signals.sourcesCount >= 3 && signals.withSales >= 1 && signals.unknownRatio < 0.4) return 'alta'
  if (signals.comparableCount >= 3 && signals.sourcesCount >= 2) return 'media'
  return 'baixa'
}

// ————————————————————————— HEATMAP —————————————————————————
const LEVEL_RANK: Record<Level, number> = { alta: 2, media: 1, baixa: 0, desconhecida: -1 }

/**
 * Resultado a partir de regras transparentes: matriz demanda×concorrência (Parte 22), ajustada
 * por preço e aderência, e LIMITADA pela confiança (confiança baixa nunca gera QUENTE;
 * inconclusiva gera INCONCLUSIVO). Internamente usa uma "temperatura" 0..2 só para combinar —
 * ela nunca é exposta como score; a saída é sempre a categoria + explicação.
 */
export function heatmap(input: { demand: Level; competition: Level; price: PriceOutlook; fit: Fit; confidence: Confidence }): Heat {
  const { demand, competition, price, fit, confidence } = input
  if (confidence === 'inconclusiva' || demand === 'desconhecida' || competition === 'desconhecida') return 'inconclusivo'
  // Base: mais demanda esquenta, mais concorrência esfria.
  let temperature = 1 + (LEVEL_RANK[demand] - 1) - (LEVEL_RANK[competition] - 1) / 2
  if (price === 'favoravel') temperature += 0.5
  if (price === 'apertado') temperature -= 0.75
  if (fit === 'alta') temperature += 0.5
  if (fit === 'baixa') temperature -= 0.5
  // Confiança baixa não pode concluir QUENTE.
  const cap = confidence === 'baixa' ? 1.5 : 3
  temperature = Math.min(temperature, cap)
  if (temperature >= 1.75) return 'quente'
  if (temperature >= 0.75) return 'morno'
  return 'frio'
}

// ————————————————————————— AVALIAÇÃO + EXPLICAÇÃO —————————————————————————
export type Assessment = {
  metrics: PriceMetrics
  signals: MarketSignals
  demand: Level
  competition: Level
  price: PriceOutlook
  fit: Fit
  confidence: Confidence
  heat: Heat
  reasons: string[]
}

const price = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Avalia uma sessão de pesquisa e devolve o resultado COM o "por quê" (obrigatório). */
export function assessSession(evidences: Evidence[], context: FitContext, target?: { min?: number; max?: number }): Assessment {
  const metrics = priceMetrics(evidences)
  const signals = marketSignals(evidences)
  const demand = demandLevel(signals)
  const competition = competitionLevel(signals)
  const outlook = priceOutlook(metrics, target?.min, target?.max)
  const fit = dgFit(context)
  const confidence = dataConfidence(signals)
  const heat = heatmap({ demand, competition, price: outlook, fit, confidence })
  const reasons: string[] = [
    `${signals.comparableCount} oferta(s) comparável(is) em ${signals.sourcesCount} fonte(s)`,
    `${signals.withReviews} com avaliações e ${signals.withSales} com vendas públicas`,
    metrics.status === 'ok' ? `mediana ${price(metrics.median)} (faixa ${price(metrics.min)}–${price(metrics.max)})` : `preço: dados insuficientes (${metrics.sampleCount}/${MIN_SAMPLES} amostras)`,
    metrics.unitStatus === 'ok' ? `mediana por unidade ${price(metrics.unitMedian)}` : 'preço por unidade: dados insuficientes',
    `demanda ${demand} · concorrência ${competition} · preço ${outlook} · aderência ${fit}`,
    context.guideExists ? 'guia relacionado existe' : 'sem guia relacionado',
    `${Math.round(signals.unknownRatio * 100)}% dos campos avaliados estão como desconhecidos`,
  ]
  return { metrics, signals, demand, competition, price: outlook, fit, confidence, heat, reasons }
}

/** Avaliação atual da oportunidade = última sessão de pesquisa (o histórico guarda as anteriores). */
export const latestSession = (opportunity: Opportunity): ResearchSession | undefined =>
  [...opportunity.sessions].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
