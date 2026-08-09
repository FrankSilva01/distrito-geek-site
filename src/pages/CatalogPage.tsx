import { Funnel } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog } from '../data/catalog-provider'

export function CatalogPage() {
  const { slug = 'todos' } = useParams(), [query, setQuery] = useState(''), [max, setMax] = useState(1000), catalog = useCatalog()
  const products = useMemo(() => catalog.filter((p) => p.status === 'published' && (slug === 'todos' || p.category === slug) && p.title.toLowerCase().includes(query.toLowerCase()) && p.price <= max), [catalog, slug, query, max])
  return <main className="container catalog"><div className="breadcrumbs">Início / Catálogo</div><div className="catalog-head"><div><p className="eyebrow">Explore</p><h1>{slug === 'todos' ? 'Todos os produtos' : slug.replaceAll('-', ' ')}</h1></div><label className="search-field">Buscar produtos<input type="search" aria-label="Buscar produtos" placeholder="Título ou categoria" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div><div className="catalog-layout"><aside><h2><Funnel /> Filtros</h2><label>Preço máximo <input type="range" min="30" max="800" value={max} onChange={(e) => setMax(Number(e.target.value))} /><span>Até R$ {max}</span></label></aside><section><p className="result-count">{products.length} resultados encontrados</p><div className="product-grid catalog-products">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>{!products.length && <div className="empty">Nenhum produto corresponde aos filtros.</div>}</section></div></main>
}
