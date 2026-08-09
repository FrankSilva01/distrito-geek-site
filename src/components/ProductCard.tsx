import { ArrowRight, ArrowsLeftRight, Heart } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { track } from '../analytics/events'
import { rememberListOrigin } from '../analytics/list-attribution'
import { useProductEngagement } from '../data/product-engagement'
import type { Product } from '../domain/product'
import { availabilityLabel, displayTitle } from '../domain/storefront-presentation'

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

/** Uma impressão por card exibido: só conta quando metade do card entra na viewport. */
function useListImpression(node: HTMLElement | null, product: Product, listName?: string, position?: number) {
  useEffect(() => {
    if (!node || !listName || !position || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      track({ event: 'view_item_list', product_id: product.id, product_name: displayTitle(product), category: product.category, price: product.price, list_name: listName, position })
    }, { threshold: 0.5 })
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, product.id, listName, position])
}

export function ProductCard({ product, listName, position }: { product: Product; listName?: string; position?: number }) {
  const title = displayTitle(product)
  const [cardNode, setCardNode] = useState<HTMLElement | null>(null)
  useListImpression(cardNode, product, listName, position)
  const { favoriteIds, compareIds, toggleFavorite, toggleCompare } = useProductEngagement()
  const favorite = favoriteIds.includes(product.id)
  const comparing = compareIds.includes(product.id)
  const compareFull = compareIds.length >= 3 && !comparing
  const onOpenProduct = () => {
    if (!listName || !position) return
    rememberListOrigin(product.id, { list_name: listName, position })
    track({ event: 'select_item', product_id: product.id, product_name: title, category: product.category, price: product.price, list_name: listName, position })
  }
  return <article className="product-card" ref={setCardNode}>
    <button className={`favorite-button ${favorite ? 'active' : ''}`} type="button" aria-pressed={favorite} aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${title} ${favorite ? 'dos' : 'aos'} favoritos`} onClick={() => toggleFavorite(product.id)}><Heart weight={favorite ? 'fill' : 'regular'}/></button>
    <Link to={`/produto/${product.slug}`} onClick={onOpenProduct}><div className="product-image"><img src={product.images[0]} alt={title} loading="lazy" decoding="async" width="560" height="560"/></div><div className="product-copy"><small>{product.attributes.Marketplace || product.category.replaceAll('-', ' ')}</small><h3>{title}</h3><strong>{money(product.price)}</strong><span className={`stock ${availabilityLabel(product) === 'Indisponível' ? 'unavailable-stock' : ''}`}>{availabilityLabel(product)}</span><span className="card-action">Ver produto <ArrowRight aria-hidden="true"/></span></div></Link>
    <button className={`compare-button ${comparing ? 'active' : ''}`} type="button" disabled={compareFull} aria-pressed={comparing} aria-label={`${comparing ? 'Remover' : 'Comparar'} ${title}${comparing ? ' da comparação' : ''}`} title={compareFull ? 'Você pode comparar até 3 produtos' : undefined} onClick={() => toggleCompare(product.id)}><ArrowsLeftRight/> {comparing ? 'Na comparação' : compareFull ? 'Limite de 3 itens' : 'Comparar'}</button>
  </article>
}
