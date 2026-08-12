import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../domain/product'
import { CatalogManager } from './CatalogManager'

const make = (over: Partial<Product>): Product => ({
  id: 'MLB1', sku: 'DG-MIN-000001', slug: 'kit-goblins-mlb1', title: 'Kit Goblins RPG 32mm',
  description: 'Kit de goblins em resina para RPG de mesa e wargames.', price: 89.9, currency: 'BRL', stock: 3,
  status: 'published', category: 'miniaturas-rpg', images: ['/assets/kit-guerreiros.png'],
  attributes: {}, featured: false, showOnStorefront: true, showOnHome: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z', ...over,
})

const products = [
  make({}),
  make({ id: 'MLB2', sku: 'DG-MIN-000002', slug: 'esqueleto-mlb2', title: 'Miniatura Esqueleto D&d 32mm', showOnStorefront: false }),
]

afterEach(() => vi.restoreAllMocks())

describe('CatalogManager', () => {
  it('renderiza tabela compacta com nome, SKU e status', () => {
    render(<CatalogManager products={products} onSaved={() => {}} notify={() => {}} />)
    expect(screen.getByText('Kit Goblins RPG 32mm')).toBeVisible()
    expect(screen.getByText(/DG-MIN-000001/)).toBeVisible()
    expect(screen.getByText('2 de 2 produtos')).toBeVisible()
    // O oculto mostra "Oculto"; o público mostra "Publicado".
    expect(screen.getByText('Oculto')).toBeVisible()
  })

  it('filtra por busca (nome/SKU) e por visibilidade', async () => {
    const user = userEvent.setup()
    render(<CatalogManager products={products} onSaved={() => {}} notify={() => {}} />)
    await user.type(screen.getByRole('searchbox'), 'esqueleto')
    expect(await screen.findByText('1 de 2 produtos')).toBeVisible()
    expect(screen.queryByText('Kit Goblins RPG 32mm')).not.toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    await user.selectOptions(screen.getByLabelText('Visibilidade'), 'ocultos')
    expect(await screen.findByText('1 de 2 produtos')).toBeVisible()
    expect(screen.getByText(/miniatura esqueleto/i)).toBeVisible()
  })

  it('abre o drawer, alterna abas e salva alteração de visibilidade', async () => {
    const onSaved = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ override: { id: 'MLB1' } })))
    const user = userEvent.setup()
    render(<CatalogManager products={products} onSaved={onSaved} notify={() => {}} />)
    await user.click(within(screen.getByText('Kit Goblins RPG 32mm').closest('tr')!).getByRole('button', { name: /editar/i }))
    expect(await screen.findByRole('dialog', { name: /editar kit goblins/i })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'SEO' }))
    expect(screen.getByDisplayValue('https://distritogeek.com.br/produto/kit-goblins-mlb1')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Visibilidade' }))
    await user.click(screen.getByLabelText(/mostrar na home/i))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/admin-products', expect.objectContaining({ method: 'PATCH' }))
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toMatchObject({ id: 'MLB1', showOnHome: false, showOnStorefront: true })
    expect(onSaved).toHaveBeenCalled()
  })

  it('aplica ação em lote nos selecionados após confirmação', async () => {
    const onSaved = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ override: {} })))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<CatalogManager products={products} onSaved={onSaved} notify={() => {}} />)
    await user.click(screen.getByLabelText('Selecionar todos os visíveis'))
    await user.click(screen.getByRole('button', { name: 'Ocultar' }))
    // Uma requisição PATCH por produto selecionado.
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.showOnStorefront).toBe(false)
  })

  it('não aplica ação em lote se a confirmação for cancelada', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<CatalogManager products={products} onSaved={() => {}} notify={() => {}} />)
    await user.click(screen.getByLabelText('Selecionar todos os visíveis'))
    await user.click(screen.getByRole('button', { name: 'Destacar' }))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
