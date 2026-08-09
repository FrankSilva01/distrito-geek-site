import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { EngagementProvider, useProductEngagement } from '../data/product-engagement'
import type { Product } from '../domain/product'
import { ProductCard } from './ProductCard'

const product: Product = {
  id: 'mlb-1', slug: 'mago-rpg', title: 'Miniatura Mago RPG 32mm', description: 'Miniatura detalhada para aventuras de RPG.',
  price: 49.9, currency: 'BRL', stock: 2, status: 'published', category: 'miniaturas-rpg', images: ['/mago.webp'],
  attributes: { Marketplace: 'Mercado Livre' }, featured: true, showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
}

function StateProbe() {
  const { favoriteIds, compareIds } = useProductEngagement()
  return <output>{`favoritos:${favoriteIds.length};comparar:${compareIds.length}`}</output>
}

describe('ProductCard engagement controls', () => {
  it('lets the visitor favorite and compare without opening the product', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><EngagementProvider><ProductCard product={product}/><StateProbe/></EngagementProvider></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: /adicionar miniatura mago rpg 32mm aos favoritos/i }))
    await user.click(screen.getByRole('button', { name: /comparar miniatura mago rpg 32mm/i }))
    expect(screen.getByText('favoritos:1;comparar:1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver produto/i })).toHaveAttribute('href', '/produto/mago-rpg')
  })
})
