import { ArrowsLeftRight, X } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'
import { useCatalog } from '../data/catalog-provider'
import { useProductEngagement } from '../data/product-engagement'
import { displayTitle } from '../domain/storefront-presentation'

export const shouldShowComparisonTray = (pathname: string, selectedCount: number) => pathname !== '/comparar' && selectedCount > 0

export function ComparisonTray() {
  const catalog = useCatalog()
  const { pathname } = useLocation()
  const { compareIds, toggleCompare } = useProductEngagement()
  const products = compareIds.map((id) => catalog.find((product) => product.id === id)).filter(Boolean)
  if (!shouldShowComparisonTray(pathname, products.length)) return null
  return <aside className="comparison-tray" aria-label="Produtos selecionados para comparação">
    <div className="container comparison-tray-inner"><span className="comparison-heading"><ArrowsLeftRight/><b>Comparar produtos</b><small>{products.length}/3</small></span><div className="comparison-items">{products.map((product) => product && <span key={product.id}>{displayTitle(product)}<button type="button" aria-label={`Remover ${displayTitle(product)} da comparação`} onClick={() => toggleCompare(product.id)}><X/></button></span>)}</div><Link className="button primary" to="/comparar">Ver comparação</Link></div>
  </aside>
}
