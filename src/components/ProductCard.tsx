import { ArrowRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { Product } from '../domain/product'
import { availabilityLabel, displayTitle } from '../domain/storefront-presentation'

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function ProductCard({ product }: { product: Product }) {
  const title = displayTitle(product)
  return <article className="product-card"><Link to={`/produto/${product.slug}`} aria-label={`Ver produto: ${title}`}><div className="product-image"><img src={product.images[0]} alt={title} loading="lazy" decoding="async" width="560" height="560"/></div><div className="product-copy"><small>{product.attributes.Marketplace || product.category.replaceAll('-', ' ')}</small><h3>{title}</h3><strong>{money(product.price)}</strong><span className={`stock ${availabilityLabel(product) === 'Indisponível' ? 'unavailable-stock' : ''}`}>{availabilityLabel(product)}</span><span className="card-action">Ver produto <ArrowRight aria-hidden="true"/></span></div></Link></article>
}
