import { CheckCircle, XCircle } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { money } from '../components/ProductCard'
import { useCatalog } from '../data/catalog-provider'
import { useProductEngagement } from '../data/product-engagement'
import { availabilityLabel, displayTitle, isPublicProduct } from '../domain/storefront-presentation'

export function ComparePage() {
  const catalog = useCatalog()
  const { compareIds, toggleCompare } = useProductEngagement()
  const products = compareIds.map((id) => catalog.find((product) => product.id === id && isPublicProduct(product))).filter(Boolean)
  const attributeNames = [...new Set(products.flatMap((product) => product ? Object.keys(product.attributes) : []))]
  return <main className="container page compare-page"><p className="eyebrow">Lado a lado</p><h1>Comparar produtos</h1><p>Compare informações do catálogo e abra o item certo para comprar no marketplace oficial.</p>{products.length ? <div className="compare-grid" style={{ '--compare-columns': products.length } as CSSProperties}>{products.map((product) => product && <article key={product.id} className="compare-column"><button type="button" className="compare-remove" onClick={() => toggleCompare(product.id)}>Remover</button><img src={product.images[0]} alt={displayTitle(product)}/><h2>{displayTitle(product)}</h2><strong>{money(product.price)}</strong><span className="compare-availability">{product.stock > 0 ? <CheckCircle/> : <XCircle/>}{availabilityLabel(product)}</span><dl><div><dt>Categoria</dt><dd>{product.category.replaceAll('-', ' ')}</dd></div>{attributeNames.map((name) => <div key={name}><dt>{name}</dt><dd>{product.attributes[name] || '—'}</dd></div>)}</dl><Link className="button primary" to={`/produto/${product.slug}`}>Ver produto</Link></article>)}</div> : <div className="empty collection-empty"><h2>Escolha até 3 produtos</h2><p>Use o botão “Comparar” nos cards do catálogo.</p><Link className="button primary" to="/categoria/todos">Ir ao catálogo</Link></div>}</main>
}
