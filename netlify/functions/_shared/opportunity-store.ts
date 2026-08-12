import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { opportunitySchema, type Opportunity } from '../../../src/domain/opportunity'

/**
 * Persistência do Radar de Oportunidades. Dados PRIVADOS (nunca no catálogo público, nunca no
 * sitemap): chave própria no mesmo store de Blobs, acessível só via endpoint admin autenticado.
 */
const STORE_NAME = 'distrito-geek-catalog'
const OPPORTUNITIES_KEY = 'radar-opportunities'

/** Entrada da API: id/datas são opcionais na criação — o servidor os carimba. */
export const opportunityInputSchema = opportunitySchema.extend({
  id: z.string().min(1).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type OpportunityInput = z.input<typeof opportunityInputSchema>

/** Puro e testável: aplica id/timestamps preservando createdAt de um registro existente. */
export function prepareOpportunity(candidate: OpportunityInput, options: { id: string; now: string; existing?: Opportunity }): Opportunity {
  return opportunitySchema.parse({
    ...candidate,
    id: candidate.id || options.existing?.id || options.id,
    createdAt: options.existing?.createdAt || candidate.createdAt || options.now,
    updatedAt: options.now,
  })
}

export function upsertOpportunity(list: Opportunity[], opportunity: Opportunity): Opportunity[] {
  return [...list.filter((item) => item.id !== opportunity.id), opportunity]
}

export async function listOpportunities(): Promise<Opportunity[]> {
  const value = await getStore(STORE_NAME).get(OPPORTUNITIES_KEY, { type: 'json' }).catch(() => null)
  if (!Array.isArray(value)) return []
  return value.map((item) => opportunitySchema.parse(item))
}

async function persist(list: Opportunity[]): Promise<void> {
  await getStore(STORE_NAME).setJSON(OPPORTUNITIES_KEY, list)
}

export async function saveOpportunity(candidate: OpportunityInput, options: { id: string; now: string }): Promise<Opportunity> {
  const list = await listOpportunities()
  const existing = candidate.id ? list.find((item) => item.id === candidate.id) : undefined
  const opportunity = prepareOpportunity(candidate, { ...options, existing })
  await persist(upsertOpportunity(list, opportunity))
  return opportunity
}

export async function deleteOpportunity(id: string): Promise<void> {
  const list = await listOpportunities()
  await persist(list.filter((item) => item.id !== id))
}
