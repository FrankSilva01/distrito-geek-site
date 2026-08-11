import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Product } from '../domain/product'
import { EngagementProvider } from '../data/product-engagement'
import { ProductCard } from './ProductCard'
import { ProductGallery } from './ProductGallery'

const product: Product = {
  id: 'mlb-1', slug: 'mago-rpg', title: 'Miniatura Mago RPG 32mm', description: 'Miniatura detalhada para aventuras de RPG.',
  price: 49.9, currency: 'BRL', stock: 2, status: 'published', category: 'miniaturas-rpg', images: ['/mago.webp'],
  attributes: { Marketplace: 'Mercado Livre' }, featured: true, showOnStorefront: true,
  listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'https://produto.mercadolivre.com.br/MLB-1', active: true }],
  version: 1, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
}

/**
 * Auditoria de image SEO travada em teste. Toda imagem de conteúdo precisa de alt
 * descritivo e dimensões declaradas (evita layout shift); imagens decorativas ficam
 * com alt vazio, mas o controle que as contém carrega o rótulo acessível.
 */
describe('image SEO', () => {
  it('dá ao card do produto alt real, lazy loading e dimensões', () => {
    const { container } = render(<MemoryRouter><EngagementProvider><ProductCard product={product} /></EngagementProvider></MemoryRouter>)
    const image = container.querySelector('.product-image img')!
    expect(image.getAttribute('alt')).toBe('Miniatura Mago RPG 32mm')
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('width')).toBeTruthy()
    expect(image.getAttribute('height')).toBeTruthy()
  })

  it('descreve a imagem principal da galeria e mantém as miniaturas decorativas com rótulo no botão', () => {
    const { container } = render(<ProductGallery images={['/a.webp', '/b.webp']} title="Miniatura Mago RPG 32mm" />)
    const main = container.querySelector('.main-image img')!
    expect(main.getAttribute('alt')).toBe('Miniatura Mago RPG 32mm')
    expect(main.getAttribute('width')).toBeTruthy()
    expect(main.getAttribute('height')).toBeTruthy()
    // A miniatura é decorativa (alt vazio), mas o botão que a envolve tem aria-label.
    const thumbButton = container.querySelector('.thumbs button')!
    expect(thumbButton.getAttribute('aria-label')).toMatch(/imagem 1 de/i)
    expect(thumbButton.querySelector('img')!.getAttribute('alt')).toBe('')
    expect(thumbButton.querySelector('img')!.getAttribute('loading')).toBe('lazy')
  })

  it('não deixa imagem de conteúdo sem alt no card', () => {
    const { container } = render(<MemoryRouter><EngagementProvider><ProductCard product={product} /></EngagementProvider></MemoryRouter>)
    for (const image of container.querySelectorAll('img')) expect(image.getAttribute('alt')).not.toBeNull()
  })
})
