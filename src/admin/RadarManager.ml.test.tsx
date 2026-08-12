import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../domain/product'
import type { Opportunity } from '../domain/opportunity'
import type { MlResult } from '../research/mercadolivre-mapping'
import { RadarManager } from './RadarManager'

const product = (): Product => ({
  id: 'p1', slug: 'kit-goblins', title: 'Kit Goblins RPG 32mm', description: 'goblins em resina para mesas de RPG',
  price: 89.9, currency: 'BRL', stock: 3, status: 'published', category: 'miniaturas-rpg', images: ['/a.png'],
  attributes: {}, featured: false, showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-01', updatedAt: '2026-08-01',
})

const opp = (): Opportunity => ({
  id: 'op1', name: 'Kit moedas RPG', category: 'acessorios-rpg', type: 'kit', format: 'kit',
  status: 'ideia', potentialGuide: false, channels: [], sessions: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
})

const mlResult = (id: string, over: Partial<MlResult['draft']> = {}): MlResult => ({
  externalId: id, imageUrl: 'https://x.jpg', sellerLabel: 'LojaRPG', categoryLabel: 'MLB1', condition: 'new',
  draft: { source: 'mercado-livre', url: `https://ml/${id}`, title: `Kit Goblin ${id}`, price: 79.9, kitQuantity: 'unknown', sold: 40, reviews: 'unknown', painted: 'desconhecido', comparability: 'parcial', collectedAt: '2026-08-12', note: 'ML', ...over },
})

/** Mocka /api/admin-opportunities e /api/admin-research-mercadolivre. */
function mockApis(ml: { status?: number; body: unknown }) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.includes('admin-research-mercadolivre')) return new Response(JSON.stringify(ml.body), { status: ml.status ?? 200 })
    const method = init?.method || 'GET'
    if (method === 'GET') return new Response(JSON.stringify({ opportunities: [opp()] }))
    const body = JSON.parse(init!.body as string)
    return new Response(JSON.stringify({ opportunity: { ...body, id: body.id || 'op1' } }))
  })
}

async function openEvidences() {
  const user = userEvent.setup()
  render(<RadarManager products={[product()]} notify={() => {}} />)
  await user.click(await screen.findByRole('button', { name: 'Abrir' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Evidências' }))
  return { user, dialog }
}

afterEach(() => vi.restoreAllMocks())

describe('RadarManager — importação do Mercado Livre', () => {
  it('busca, mostra resultados e controla seleção', async () => {
    mockApis({ body: { configured: true, metadata: { query: 'goblin rpg' }, results: [mlResult('A'), mlResult('B')] } })
    const { user, dialog } = await openEvidences()
    await user.type(within(dialog).getByLabelText('Buscar no Mercado Livre'), 'goblin rpg')
    await user.click(within(dialog).getByRole('button', { name: 'Buscar no Mercado Livre' }))
    expect(await within(dialog).findByText('2 resultado(s) do Mercado Livre')).toBeVisible()
    expect(within(dialog).getByText('2 de 2 selecionados')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Desmarcar todos' }))
    expect(within(dialog).getByText('0 de 2 selecionados')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar todos' }))
    expect(within(dialog).getByText('2 de 2 selecionados')).toBeVisible()
  })

  it('REGRESSÃO: sold ausente aparece como "?" e nunca 0', async () => {
    mockApis({ body: { configured: true, metadata: { query: 'goblin' }, results: [mlResult('A', { sold: 'unknown' })] } })
    const { user, dialog } = await openEvidences()
    await user.type(within(dialog).getByLabelText('Buscar no Mercado Livre'), 'goblin')
    await user.click(within(dialog).getByRole('button', { name: 'Buscar no Mercado Livre' }))
    const soldCell = (await within(dialog).findByText('Kit Goblin A')).closest('tr')!.querySelector('td[data-label="Vendidos"]')!
    expect(soldCell.textContent).toBe('?')
    expect(soldCell.textContent).not.toBe('0')
  })

  it('importa selecionados criando nova ResearchSession e recalcula (comparáveis contam)', async () => {
    mockApis({ body: { configured: true, metadata: { query: 'goblin rpg' }, results: [mlResult('A', { price: 70 }), mlResult('B', { price: 80 }), mlResult('C', { price: 90 })] } })
    const { user, dialog } = await openEvidences()
    await user.type(within(dialog).getByLabelText('Buscar no Mercado Livre'), 'goblin rpg')
    await user.click(within(dialog).getByRole('button', { name: 'Buscar no Mercado Livre' }))
    await within(dialog).findByText('3 resultado(s) do Mercado Livre')
    // Promove as três a "Comparável" antes de importar (revisão humana) — só os selects das linhas ML.
    for (const id of ['A', 'B', 'C']) {
      const row = within(dialog).getByText(`Kit Goblin ${id}`).closest('tr')!
      await user.selectOptions(within(row).getByRole('combobox'), 'comparavel')
    }
    await user.click(within(dialog).getByRole('button', { name: /importar selecionados \(3\)/i }))
    // Nova sessão vira a atual: a tabela de evidências mostra os itens importados.
    expect(await within(dialog).findByText('Kit Goblin A')).toBeVisible()
    // Motor recalcula: aba Mercado mostra 3 amostras comparáveis e mediana 80.
    await user.click(within(dialog).getByRole('button', { name: 'Mercado' }))
    expect(within(dialog).getByText('Amostras comparáveis').nextSibling).toHaveTextContent('3')
    expect(within(dialog).getByText('Mediana').closest('div')).toHaveTextContent(/R\$\s?80,00/)
  })

  it('feature flag: não configurado mostra aviso e Radar segue manual', async () => {
    mockApis({ body: { configured: false, message: 'Mercado Livre não configurado.' } })
    const { user, dialog } = await openEvidences()
    await user.type(within(dialog).getByLabelText('Buscar no Mercado Livre'), 'goblin')
    await user.click(within(dialog).getByRole('button', { name: 'Buscar no Mercado Livre' }))
    expect(await within(dialog).findByText(/mercado livre não configurado/i)).toBeVisible()
  })

  it('erro do provider é explicado sem quebrar o Radar', async () => {
    mockApis({ status: 502, body: { configured: true, code: 'upstream', message: 'O Mercado Livre está indisponível no momento.' } })
    const { user, dialog } = await openEvidences()
    await user.type(within(dialog).getByLabelText('Buscar no Mercado Livre'), 'goblin')
    await user.click(within(dialog).getByRole('button', { name: 'Buscar no Mercado Livre' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/indisponível/i)
  })
})
