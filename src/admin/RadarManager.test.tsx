import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../domain/product'
import type { Opportunity } from '../domain/opportunity'
import { RadarManager } from './RadarManager'

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1', slug: 'kit-goblins', title: 'Kit Goblins RPG 32mm', description: 'goblins em resina',
  price: 89.9, currency: 'BRL', stock: 3, status: 'published', category: 'miniaturas-rpg', images: ['/a.png'],
  attributes: {}, featured: false, showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-01', updatedAt: '2026-08-01', ...over,
})

const opp = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: 'op1', name: 'Kit moedas RPG', category: 'acessorios-rpg', type: 'kit', format: 'kit',
  status: 'ideia', potentialGuide: false, channels: ['shopee'], sessions: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', ...over,
})

function mockApi(list: Opportunity[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const method = init?.method || 'GET'
    if (method === 'GET') return new Response(JSON.stringify({ opportunities: list }))
    if (method === 'POST' || method === 'PUT') {
      const body = JSON.parse((init!.body as string))
      return new Response(JSON.stringify({ opportunity: { ...body, id: body.id || 'new-id' } }))
    }
    return new Response(JSON.stringify({ deleted: String(input) }))
  })
}

afterEach(() => vi.restoreAllMocks())

describe('RadarManager', () => {
  it('lista oportunidades com resultado e confiança em texto (a11y)', async () => {
    mockApi([opp()])
    render(<RadarManager products={[product()]} notify={() => {}} />)
    expect(await screen.findByText('Kit moedas RPG')).toBeVisible()
    expect(screen.getByText('1 de 1 oportunidades')).toBeVisible()
    // Sem evidências => Inconclusivo, e o rótulo é textual (não só cor).
    expect(screen.getAllByText('Inconclusivo').length).toBeGreaterThan(0)
  })

  it('filtra por status', async () => {
    mockApi([opp({ id: 'a', name: 'Moedas', status: 'ideia' }), opp({ id: 'b', name: 'Dragão épico', status: 'aprovado', channels: [] })])
    const user = userEvent.setup()
    render(<RadarManager products={[product()]} notify={() => {}} />)
    await screen.findByText('Moedas')
    await user.selectOptions(screen.getByLabelText('Status'), 'aprovado')
    expect(await screen.findByText('1 de 2 oportunidades')).toBeVisible()
    expect(screen.getByText('Dragão épico')).toBeVisible()
    expect(screen.queryByText('Moedas')).not.toBeInTheDocument()
  })

  it('abre o drawer e recalcula o resultado ao adicionar evidências (unknown ≠ zero)', async () => {
    mockApi([opp()])
    const user = userEvent.setup()
    render(<RadarManager products={[product()]} notify={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Evidências' }))
    // Adiciona 3 evidências comparáveis com preço e vendas conhecidos.
    for (const [price, sold] of [[70, 10], [80, 8], [90, 5]] as const) {
      await user.clear(within(dialog).getByLabelText('Título do anúncio'))
      await user.type(within(dialog).getByLabelText('Título do anúncio'), `Anúncio ${price}`)
      await user.clear(within(dialog).getByLabelText('Preço (R$)'))
      await user.type(within(dialog).getByLabelText('Preço (R$)'), String(price))
      await user.clear(within(dialog).getByLabelText('Vendidos'))
      await user.type(within(dialog).getByLabelText('Vendidos'), String(sold))
      await user.click(within(dialog).getByRole('button', { name: /adicionar evidência/i }))
    }
    // A aba Mercado deve mostrar a mediana calculada (80) — prova de recálculo automático.
    await user.click(within(dialog).getByRole('button', { name: 'Mercado' }))
    expect(within(dialog).getByText('Amostras comparáveis').nextSibling).toHaveTextContent('3')
    // Mediana de 70/80/90 = 80 (recálculo automático). Alvo a linha da Mediana (Média também é 80).
    expect(within(dialog).getByText('Mediana').closest('div')).toHaveTextContent(/R\$\s?80,00/)
  })

  it('cria uma oportunidade a partir de um guia sem produto', async () => {
    mockApi([])
    const user = userEvent.setup()
    render(<RadarManager products={[product()]} notify={() => {}} />)
    await screen.findByText('0 de 0 oportunidades')
    await user.click(screen.getByRole('button', { name: /conteúdo sem produto/i }))
    const createButtons = await screen.findAllByRole('button', { name: 'Criar oportunidade' })
    await user.click(createButtons[0])
    // Abre o drawer já com o nome preenchido a partir do guia.
    expect(await screen.findByRole('dialog')).toBeVisible()
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value.length).toBeGreaterThan(0)
  })

  it('salva a oportunidade via API', async () => {
    const fetchSpy = mockApi([opp()])
    const notify = vi.fn()
    const user = userEvent.setup()
    render(<RadarManager products={[product()]} notify={notify} />)
    await user.click(await screen.findByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar oportunidade' }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/admin-opportunities', expect.objectContaining({ method: 'PUT' })))
    expect(notify).toHaveBeenCalledWith('Oportunidade salva.')
  })
})
