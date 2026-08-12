// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prepareOpportunity, upsertOpportunity } from '../../netlify/functions/_shared/opportunity-store'
import handler from '../../netlify/functions/admin-opportunities'
import type { Opportunity } from '../domain/opportunity'

const base = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: 'op1', name: 'Kit moedas RPG', category: 'acessorios-rpg', type: 'kit', format: 'kit',
  status: 'ideia', potentialGuide: false, channels: [], sessions: [],
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', ...over,
})

describe('opportunity-store (helpers puros)', () => {
  it('carimba id e datas na criação', () => {
    const prepared = prepareOpportunity({ name: 'Nova ideia' }, { id: 'generated-id', now: '2026-08-12T10:00:00.000Z' })
    expect(prepared.id).toBe('generated-id')
    expect(prepared.createdAt).toBe('2026-08-12T10:00:00.000Z')
    expect(prepared.updatedAt).toBe('2026-08-12T10:00:00.000Z')
    expect(prepared.status).toBe('ideia')
  })

  it('preserva createdAt de um registro existente e só atualiza updatedAt', () => {
    const existing = base({ createdAt: '2026-07-01T00:00:00.000Z' })
    const prepared = prepareOpportunity({ ...existing, name: 'Renomeado' }, { id: 'x', now: '2026-08-12T10:00:00.000Z', existing })
    expect(prepared.id).toBe('op1')
    expect(prepared.createdAt).toBe('2026-07-01T00:00:00.000Z')
    expect(prepared.updatedAt).toBe('2026-08-12T10:00:00.000Z')
    expect(prepared.name).toBe('Renomeado')
  })

  it('upsert substitui por id e acrescenta novos', () => {
    const list = [base({ id: 'a' }), base({ id: 'b' })]
    const replaced = upsertOpportunity(list, base({ id: 'a', name: 'Atualizado' }))
    expect(replaced).toHaveLength(2)
    expect(replaced.find((item) => item.id === 'a')?.name).toBe('Atualizado')
    const added = upsertOpportunity(list, base({ id: 'c' }))
    expect(added.map((item) => item.id).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('admin-opportunities (segurança)', () => {
  beforeEach(() => { process.env.SESSION_SECRET = 'a-secret-with-at-least-32-characters' })
  afterEach(() => { delete process.env.SESSION_SECRET })

  it('rejeita requisições sem sessão admin', async () => {
    const response = await handler(new Request('https://distritogeek.com.br/api/admin-opportunities'))
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
