import { ArrowRight, ArrowsLeftRight, Heart } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useProductEngagement } from '../data/product-engagement'
import type { Product } from '../domain/product'
import { availabilityLabel, displayTitle } from '../domain/storefront-presentation'

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function ProductCard({ product }: { product: Product }) {
  const title = displayTitle(product)
  const { favoriteIds, compareIds, toggleFavorite, toggleCompare } = useProductEngagement()
  const favorite = favoriteIds.includes(product.id)
  const comparing = compareIds.includes(product.id)
  const compareFull = compareIds.length >= 3 && !comparing
  return <article className="product-card">
    <button className={`favorite-button ${favorite ? 'active' : ''}`} type="button" aria-pressed={favorite} aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${title} ${favorite ? 'dos' : 'aos'} favoritos`} onClick={() => toggleFavorite(product.id)}><Heart weight={favorite ? 'fill' : 'regular'}/></button>
    <Link to={`/produto/${product.slug}`} aria-label={`Ver produto: ${title}`}><div className="product-image"><img src={product.images[0]} alt={title} loading="lazy" decoding="async" width="560" height="560"/></div><div className="product-copy"><small>{product.attributes.Marketplace || product.category.replaceAll('-', ' ')}</small><h3>{title}</h3><strong>{money(product.price)}</strong><span className={`stock ${availabilityLabel(product) === 'Indisponível' ? 'unavailable-stock' : ''}`}>{availabilityLabel(product)}</span><span className="card-action">Ver produto <ArrowRight aria-hidden="true"/></span></div></Link>
    <button className={`compare-button ${comparing ? 'active' : ''}`} type="button" disabled={compareFull} aria-pressed={comparing} aria-label={`${comparing ? 'Remover' : 'Comparar'} ${title}${comparing ? ' da comparação' : ''}`} title={compareFull ? 'Você pode comparar até 3 produtos' : undefined} onClick={() => toggleCompare(product.id)}><ArrowsLeftRight/> {comparing ? 'Na comparação' : compareFull ? 'Limite de 3 itens' : 'Comparar'}</button>
  </article>
}
