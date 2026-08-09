import { Link } from 'react-router-dom'
import type { Product } from '../domain/product'
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export function ProductCard({ product }: { product: Product }) { return <article className="product-card"><Link to={`/produto/${product.slug}`} aria-label={`Ver detalhes de ${product.title}`}><div className="product-image"><img src={product.images[0]} alt={product.title}/><span>Ver produto</span></div><h3>{product.title}</h3><strong>{money(product.price)}</strong></Link></article> }
