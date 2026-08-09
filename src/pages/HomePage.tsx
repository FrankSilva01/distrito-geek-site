import { ArrowRight, LockKey, Medal, Package, Printer, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogStatus } from '../data/catalog-provider'

export function HomePage() {
  const catalog = useCatalog().filter((p) => p.status === 'published')
  const { loading, error } = useCatalogStatus()
  const featured = [...catalog.filter((p) => p.featured), ...catalog.filter((p) => !p.featured)].slice(0, 8)
  const categoryCards = catalog.reduce<Record<string, typeof catalog[number]>>((result, product) => { result[product.category] ||= product; return result }, {})
  return <>
    <section className="hero"><div className="container hero-content"><span className="hero-badge"><Sparkle/> Curadoria para colecionadores</span><p className="eyebrow">Miniaturas • RPG • Colecionáveis</p><h1>SEU UNIVERSO GEEK<br/><em>COMEÇA AQUI</em></h1><p>Descubra peças únicas, compare detalhes e compre diretamente nos anúncios oficiais dos marketplaces.</p><div className="actions"><Link className="button primary" to="/categoria/todos">Explorar catálogo</Link><Link className="button ghost" to="/faq">Como funciona</Link></div><div className="hero-proof"><ShieldCheck/><span><b>Compra no marketplace</b>Preço, estoque e condições sempre atualizados pela integração.</span></div></div></section>
    <section className="benefits"><div className="container benefit-grid"><div><Printer/><span><b>Impressão 8K</b>Acabamento detalhado</span></div><div><Medal/><span><b>Curadoria geek</b>Seleção especializada</span></div><div><Package/><span><b>Estoque sincronizado</b>Dados do anúncio oficial</span></div><div><LockKey/><span><b>Compra segura</b>Finalizada no marketplace</span></div></div></section>
    <section className="section container"><header className="section-title"><p>Destaques</p><h2>Escolhas para a sua próxima aventura</h2><span>Produtos reais sincronizados com os anúncios oficiais.</span></header>{loading ? <div className="catalog-state" role="status">Atualizando catálogo…</div> : error ? <div className="catalog-state error" role="alert">{error}</div> : <div className="product-grid">{featured.map((p) => <ProductCard key={p.id} product={p}/>)}</div>}<div className="center"><Link className="button primary" to="/categoria/todos">Ver catálogo completo <ArrowRight/></Link></div></section>
    <section className="safe-section"><div className="container safe-layout"><header><p className="eyebrow">Compre com segurança</p><h2>Você conhece o produto aqui e conclui onde confia.</h2></header><div className="market-grid"><div><b>Mercado Livre</b><span>Preço, disponibilidade, imagens e link oficial vindos da sincronização existente.</span></div><div><b>Shopee e outros</b><span>Anúncios reais cadastrados internamente aparecem quando estiverem ativos.</span></div></div></div></section>
    {Object.keys(categoryCards).length > 0 && <section className="section container"><header className="section-title"><p>Categorias</p><h2>Encontre o que combina com você</h2></header><div className="category-grid">{Object.entries(categoryCards).slice(0,3).map(([category, product]) => <Link key={category} to={`/categoria/${category}`}><img src={product.images[0]} alt="" loading="lazy" width="560" height="360"/><span><b>{category.replaceAll('-', ' ')}</b><small>Ver seleção <ArrowRight/></small></span></Link>)}</div></section>}
  </>
}
