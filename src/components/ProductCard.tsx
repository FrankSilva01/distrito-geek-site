import { ArrowRight, ArrowsLeftRight, Heart } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackEcommerce, type EcommercePayload } from '../analytics/events'
import { rememberListOrigin } from '../analytics/list-attribution'
import { productListName, type ProductListId } from '../analytics/product-lists'
import { useProductEngagement } from '../data/product-engagement'
import type { Product } from '../domain/product'
import { availabilityLabel, displayTitle } from '../domain/storefront-presentation'

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function listPayload(product: Product, listId: ProductListId, position: number): EcommercePayload {
  const item_list_name = productListName(listId)
  return {
    item_list_id: listId,
    item_list_name,
    items: [{ item_id: product.id, item_name: displayTitle(product), item_category: product.category, item_list_id: listId, item_list_name, index: position, price: product.price, currency: 'BRL' }],
  }
}

/** Uma impressão por card exibido: só conta quando metade do card entra na viewport. */
function useListImpression(node: HTMLElement | null, product: Product, listId?: ProductListId, position?: number) {
  useEffect(() => {
    if (!node || !listId || !position || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      trackEcommerce('view_item_list', listPayload(product, listId, position))
    }, { threshold: 0.5 })
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, product.id, listId, position])
}

export function ProductCard({ product, listId, position }: { product: Product; listId?: ProductListId; position?: number }) {
  const title = displayTitle(product)
  const [cardNode, setCardNode] = useState<HTMLElement | null>(null)
  useListImpression(cardNode, product, listId, position)
  const { favoriteIds, compareIds, toggleFavorite, toggleCompare } = useProductEngagement()
  const favorite = favoriteIds.includes(product.id)
  const comparing = compareIds.includes(product.id)
  const compareFull = compareIds.length >= 3 && !comparing
  const onOpenProduct = () => {
    if (!listId || !position) return
    rememberListOrigin(product.id, { list_name: listId, position })
    trackEcommerce('select_item', listPayload(product, listId, position))
  }
  return <article className="product-card" ref={setCardNode}>
    <button className={`favorite-button ${favorite ? 'active' : ''}`} type="button" aria-pressed={favorite} aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${title} ${favorite ? 'dos' : 'aos'} favoritos`} onClick={() => toggleFavorite(product.id)}><Heart weight={favorite ? 'fill' : 'regular'}/></button>
    <Link to={`/produto/${product.slug}`} onClick={onOpenProduct}><div className="product-image"><img src={product.images[0]} alt={title} loading="lazy" decoding="async" width="560" height="560"/></div><div className="product-copy"><small>{product.attributes.Marketplace || product.category.replaceAll('-', ' ')}</small><h3>{title}</h3><strong>{money(product.price)}</strong><span className={`stock ${availabilityLabel(product) === 'Indisponível' ? 'unavailable-stock' : ''}`}>{availabilityLabel(product)}</span><span className="card-action">Ver produto <ArrowRight aria-hidden="true"/></span></div></Link>
    <button className={`compare-button ${comparing ? 'active' : ''}`} type="button" disabled={compareFull} aria-pressed={comparing} aria-label={`${comparing ? 'Remover' : 'Comparar'} ${title}${comparing ? ' da comparação' : ''}`} title={compareFull ? 'Você pode comparar até 3 produtos' : undefined} onClick={() => toggleCompare(product.id)}><ArrowsLeftRight/> {comparing ? 'Na comparação' : compareFull ? 'Limite de 3 itens' : 'Comparar'}</button>
  </article>
}
