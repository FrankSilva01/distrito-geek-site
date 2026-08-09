import { Funnel, MagnifyingGlass } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogStatus } from '../data/catalog-provider'

export function CatalogPage() {
  const { slug = 'todos' } = useParams()
  const [query, setQuery] = useState(''), [max, setMax] = useState(5000), [sort, setSort] = useState('recentes')
  const catalog = useCatalog(), { loading, error } = useCatalogStatus()
  const categories = [...new Set(catalog.filter((p) => p.status === 'published').map((p) => p.category))]
  const products = useMemo(() => {
    const result = catalog.filter((p) => p.status === 'published' && (slug === 'todos' || p.category === slug) && `${p.title} ${p.category}`.toLowerCase().includes(query.toLowerCase()) && p.price <= max)
    return result.sort((a,b) => sort === 'menor-preco' ? a.price-b.price : sort === 'maior-preco' ? b.price-a.price : sort === 'az' ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt))
  }, [catalog, slug, query, max, sort])
  return <main className="container catalog"><nav className="breadcrumbs" aria-label="Navegação estrutural"><Link to="/">Início</Link> / Catálogo</nav><div className="catalog-head"><div><p className="eyebrow">Explore</p><h1>{slug === 'todos' ? 'Todos os produtos' : slug.replaceAll('-', ' ')}</h1><p>Dados atualizados a partir dos marketplaces conectados.</p></div><label className="search-field">Buscar produtos<span><MagnifyingGlass/><input type="search" aria-label="Buscar produtos" placeholder="Título ou categoria" value={query} onChange={(e) => setQuery(e.target.value)} /></span></label></div><div className="catalog-toolbar"><b>{products.length} produtos</b><label>Ordenar por<select aria-label="Ordenar produtos" value={sort} onChange={(e)=>setSort(e.target.value)}><option value="recentes">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option><option value="az">Nome A–Z</option></select></label></div><div className="catalog-layout"><aside><h2><Funnel /> Filtros</h2><div className="category-links"><Link className={slug==='todos'?'active':''} to="/categoria/todos">Todos</Link>{categories.map((category)=><Link className={slug===category?'active':''} key={category} to={`/categoria/${category}`}>{category.replaceAll('-', ' ')}</Link>)}</div><label>Preço máximo<input type="range" min="30" max="5000" step="10" value={max} onChange={(e) => setMax(Number(e.target.value))} /><span>Até {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(max)}</span></label></aside><section>{loading ? <div className="catalog-state" role="status">Atualizando catálogo…</div> : error ? <div className="catalog-state error" role="alert">{error}</div> : products.length ? <div className="product-grid catalog-products">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty">Nenhum produto corresponde aos filtros.</div>}</section></div></main>
}
