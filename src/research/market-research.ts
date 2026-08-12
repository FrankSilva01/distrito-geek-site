import type { Evidence, UnknownNumber } from '../domain/opportunity'
import { isKnown } from '../domain/opportunity'

/**
 * PROVA DE VIABILIDADE — coleta automática de evidências para o Radar.
 *
 * Este módulo é ANDAIME (interfaces + normalização), não integração de produção. Nenhum
 * provider aqui faz rede: os providers automáticos declaram capacidade e lançam
 * `NotImplemented` até uma rodada dedicada com credenciais. O objetivo é fixar o contrato
 * `MarketResearchProvider → Evidence[]` sem tocar no motor do Radar nem no schema de Evidence.
 *
 * Conclusão da investigação (ver docs/pesquisa-coleta-automatica.md):
 * - Mercado Livre  → VIÁVEL (search público autenticado); sold/available são REFERENCIAIS.
 * - Shopee Afiliados→ VIÁVEL (productOfferV2), exige conta de afiliado aprovada.
 * - TikTok Shop    → NÃO VIÁVEL por API oficial (APIs são da própria loja).
 * - Google         → Custom Search JSON API fechado p/ novos clientes → só descoberta manual.
 * - Lojas espec.   → sem API padronizada → manual.
 */

export type ProviderId = 'mercado-livre' | 'shopee-afiliados' | 'manual'

/** Rascunho de evidência: igual a Evidence, sem o `id` (atribuído na persistência/UI). */
export type EvidenceDraft = Omit<Evidence, 'id'>

export type MarketQuery = {
  /** Termo de busca (ex.: "kit moedas rpg"). */
  term: string
  /** Máximo de resultados a coletar (o provider respeita o rate limit). */
  limit?: number
  /** País/site alvo — hoje só Brasil interessa. */
  site?: 'MLB'
}

/**
 * O que cada fonte CONSEGUE preencher. `referential` = valor aproximado/bucketizado (não exato):
 * é o caso de `sold` no Mercado Livre. Campo que a fonte não fornece fica UNKNOWN, jamais 0.
 */
export type FieldSupport = 'exact' | 'referential' | 'none'
export type ProviderCapabilities = {
  publicSearch: boolean
  price: FieldSupport
  sold: FieldSupport
  reviews: FieldSupport
  seller: FieldSupport
  image: FieldSupport
  category: FieldSupport
  kitQuantity: FieldSupport
}

export type ProviderAvailability = 'viable' | 'needs-approval' | 'not-viable'

export interface MarketResearchProvider {
  readonly id: ProviderId
  readonly label: string
  readonly availability: ProviderAvailability
  readonly capabilities: ProviderCapabilities
  /** Requisitos de credencial/autorização em texto (para a UI de configuração futura). */
  readonly authNote: string
  /** Coleta evidências para o termo. Providers automáticos ainda lançam NotImplementedError. */
  search(query: MarketQuery): Promise<EvidenceDraft[]>
}

export class NotImplementedError extends Error {
  constructor(providerId: ProviderId) {
    super(`Provider "${providerId}" ainda não conecta produção. Requer rodada dedicada + credenciais.`)
    this.name = 'NotImplementedError'
  }
}

/**
 * Coerção UNKNOWN-safe: só vira número um valor numérico finito real. null/undefined/NaN/''
 * viram 'unknown' — a ausência de dado NUNCA é convertida em 0. Espelha a regra crítica do motor.
 */
export function toUnknownNumber(value: unknown): UnknownNumber {
  return typeof value === 'number' && Number.isFinite(value) ? value : 'unknown'
}

/** Registro cru vindo de um provider antes de virar Evidence. Tudo opcional/desconhecido. */
export type RawMarketRecord = {
  url?: string
  title?: string
  price?: unknown
  kitQuantity?: unknown
  sold?: unknown
  reviews?: unknown
  scale?: string
  material?: string
  note?: string
}

/**
 * Normaliza um registro cru em EvidenceDraft aplicando UNKNOWN-por-ausência. A comparabilidade
 * começa em 'comparavel' e é revista por um humano — a máquina não decide comparabilidade.
 * Quando o provider entrega valor referencial (ex.: sold do ML), o chamador passa uma `note`
 * explicando; o número entra como sinal, mas o texto registra que é aproximado.
 */
export function normalizeEvidence(raw: RawMarketRecord, source: Evidence['source'], capturedAt: string): EvidenceDraft {
  return {
    source,
    url: (raw.url ?? '').trim(),
    title: (raw.title ?? '').trim(),
    price: toUnknownNumber(raw.price),
    kitQuantity: toUnknownNumber(raw.kitQuantity),
    sold: toUnknownNumber(raw.sold),
    reviews: toUnknownNumber(raw.reviews),
    painted: 'desconhecido',
    comparability: 'comparavel',
    collectedAt: capturedAt,
    ...(raw.scale ? { scale: raw.scale } : {}),
    ...(raw.material ? { material: raw.material } : {}),
    ...(raw.note ? { note: raw.note } : {}),
  }
}

/** Quantos campos-chave ficaram desconhecidos — útil para a UI sinalizar qualidade da coleta. */
export function unknownFieldCount(draft: EvidenceDraft): number {
  return [draft.price, draft.kitQuantity, draft.sold, draft.reviews].filter((value) => !isKnown(value)).length
}

// ————————————————————— Providers (andaime, sem rede) —————————————————————

/** Mercado Livre — RECOMENDADO para a primeira implementação. Search público autenticado. */
export const mercadoLivreProvider: MarketResearchProvider = {
  id: 'mercado-livre',
  label: 'Mercado Livre',
  availability: 'viable',
  authNote: 'App registrado no ML (OAuth2). Não exige conta de vendedor para o /sites/MLB/search.',
  capabilities: { publicSearch: true, price: 'exact', sold: 'referential', reviews: 'none', seller: 'exact', image: 'exact', category: 'exact', kitQuantity: 'none' },
  async search() { throw new NotImplementedError('mercado-livre') },
}

/** Shopee Afiliados — VIÁVEL, porém exige conta de afiliado aprovada (assinatura SHA256). */
export const shopeeAffiliateProvider: MarketResearchProvider = {
  id: 'shopee-afiliados',
  label: 'Shopee (Afiliados)',
  availability: 'needs-approval',
  authNote: 'Conta na Shopee Affiliate Open Platform (AppId + Secret, assinatura SHA256).',
  capabilities: { publicSearch: true, price: 'exact', sold: 'exact', reviews: 'exact', seller: 'exact', image: 'exact', category: 'referential', kitQuantity: 'none' },
  async search() { throw new NotImplementedError('shopee-afiliados') },
}

/** Manual — fallback sempre disponível (colar URL, CSV, cadastro manual). Já é a UI atual do Radar. */
export const manualProvider: MarketResearchProvider = {
  id: 'manual',
  label: 'Manual / import',
  availability: 'viable',
  authNote: 'Nenhuma credencial. Cadastro manual, colar URL ou importar CSV.',
  capabilities: { publicSearch: false, price: 'exact', sold: 'exact', reviews: 'exact', seller: 'exact', image: 'exact', category: 'exact', kitQuantity: 'exact' },
  async search() { throw new NotImplementedError('manual') /* a coleta manual é feita pela UI, não por este método */ },
}

export const PROVIDERS: MarketResearchProvider[] = [mercadoLivreProvider, shopeeAffiliateProvider, manualProvider]
