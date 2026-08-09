import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConsent, setConsent } from '../analytics/events'
import { clearListOrigins, readListOrigin } from '../analytics/list-attribution'
import type { ProductListId } from '../analytics/product-lists'
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

class IntersectionObserverStub {
  static instances: IntersectionObserverStub[] = []
  private target: Element | null = null
  constructor(private readonly callback: IntersectionObserverCallback) { IntersectionObserverStub.instances.push(this) }
  observe(target: Element) { this.target = target }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
  enterViewport() { this.callback([{ isIntersecting: true, target: this.target } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
}

const renderCard = (props: { listId?: ProductListId; position?: number } = {}) =>
  render(<MemoryRouter><EngagementProvider><ProductCard product={product} {...props}/></EngagementProvider></MemoryRouter>)

const eventsNamed = (name: string) => (window.dataLayer ?? []).filter((item) => (item as { event?: string }).event === name)

describe('ProductCard list measurement', () => {
  beforeEach(() => {
    IntersectionObserverStub.instances = []
    window.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver
    delete window.dataLayer
    clearListOrigins()
    resetConsent()
  })

  it('records one impression and one selection in the GA4 ecommerce shape', async () => {
    setConsent('granted')
    const user = userEvent.setup()
    renderCard({ listId: 'catalogo', position: 3 })
    IntersectionObserverStub.instances.at(-1)!.enterViewport()

    expect(eventsNamed('view_item_list')).toHaveLength(1)
    expect(eventsNamed('view_item_list')[0]).toEqual({
      event: 'view_item_list',
      ecommerce: {
        item_list_id: 'catalogo',
        item_list_name: 'Catálogo',
        items: [{ item_id: 'mlb-1', item_name: 'Miniatura Mago RPG 32mm', item_category: 'miniaturas-rpg', item_list_id: 'catalogo', item_list_name: 'Catálogo', index: 3, price: 49.9, currency: 'BRL' }],
      },
    })

    await user.click(screen.getByRole('link', { name: /ver produto/i }))
    expect(eventsNamed('select_item')).toHaveLength(1)
    expect(eventsNamed('select_item')[0]).toEqual(expect.objectContaining({ ecommerce: expect.objectContaining({ item_list_id: 'catalogo' }) }))
    expect(readListOrigin('mlb-1')).toEqual({ list_name: 'catalogo', position: 3 })
  })

  it('clears the previous ecommerce object before each event so lists do not merge', () => {
    setConsent('granted')
    renderCard({ listId: 'catalogo', position: 3 })
    IntersectionObserverStub.instances.at(-1)!.enterViewport()
    const pushed = window.dataLayer ?? []
    const eventIndex = pushed.findIndex((item) => (item as { event?: string }).event === 'view_item_list')
    expect(pushed[eventIndex - 1]).toEqual({ ecommerce: null })
  })

  it('does not measure lists when the card is rendered without list context', async () => {
    setConsent('granted')
    const user = userEvent.setup()
    renderCard()
    expect(IntersectionObserverStub.instances).toHaveLength(0)
    await user.click(screen.getByRole('link', { name: /ver produto/i }))
    expect(window.dataLayer ?? []).toHaveLength(0)
    expect(readListOrigin('mlb-1')).toBeNull()
  })

  it('keeps list measurement out of the dataLayer before consent', () => {
    renderCard({ listId: 'catalogo', position: 1 })
    IntersectionObserverStub.instances.at(-1)!.enterViewport()
    expect(window.dataLayer ?? []).toHaveLength(0)
  })
})
