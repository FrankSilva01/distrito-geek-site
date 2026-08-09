import { ArrowRight, LockKey, Medal, Package, Printer, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogStatus } from '../data/catalog-provider'
import { homeCategories, selectHomeFeatured } from '../domain/home-curation'

export function HomePage() {
  const catalog = useCatalog()
  const { loading, error } = useCatalogStatus()
  const featured = selectHomeFeatured(catalog, 8)
  const categories = homeCategories(catalog)
  const hasShopee = catalog.some((product) => product.listings.some((listing) => listing.marketplace === 'shopee' && listing.active))
  return <>
    <section className="hero"><div className="container hero-content"><span className="hero-badge"><Sparkle/> Curadoria para colecionadores</span><p className="eyebrow">Miniaturas • RPG • Colecionáveis</p><h1>SEU UNIVERSO GEEK<br/><em>COMEÇA AQUI</em></h1><p>Descubra peças únicas, compare detalhes e compre diretamente nos anúncios oficiais dos marketplaces.</p><div className="actions"><Link className="button primary" to="/categoria/todos">Explorar catálogo</Link><Link className="button ghost" to="/faq">Como funciona</Link></div><div className="hero-proof"><ShieldCheck/><span><b>Compra no marketplace</b>Preço, disponibilidade e condições atualizados pela integração.</span></div></div></section>
    <section className="benefits"><div className="container benefit-grid"><div><Printer/><span><b>Resina 8K</b>Alto nível de detalhes</span></div><div><Medal/><span><b>Produção sob demanda</b>Conforme disponibilidade</span></div><div><Package/><span><b>Envio para todo o Brasil</b>Compra e entrega pelo marketplace</span></div><div><LockKey/><span><b>Compra segura</b>Finalizada no marketplace</span></div></div></section>
    <section className="section container"><header className="section-title"><p>Destaques</p><h2>Escolhas para a sua próxima aventura</h2><span>Uma seleção diversa de produtos reais sincronizados.</span></header>{loading ? <div className="catalog-state" role="status">Atualizando catálogo…</div> : error ? <div className="catalog-state error" role="alert">{error}</div> : <div className="product-grid">{featured.map((product) => <ProductCard key={product.id} product={product}/>)}</div>}<div className="center"><Link className="button primary" to="/categoria/todos">Ver catálogo completo <ArrowRight/></Link></div></section>
    <section className="safe-section"><div className="container safe-layout"><header><p className="eyebrow">Compre com segurança</p><h2>Escolha onde finalizar sua compra</h2><p>Veja os produtos aqui e finalize no marketplace de sua preferência.</p></header><div className="market-grid"><div className="market-card mercado-livre"><b>Mercado Livre</b><span>Preço, disponibilidade e link oficial sincronizados.</span><Link to="/categoria/todos">Ver anúncios <ArrowRight/></Link></div>{hasShopee && <div className="market-card shopee"><b>Shopee</b><span>Links cadastrados quando disponíveis.</span><Link to="/categoria/todos?marketplace=shopee">Ver anúncios <ArrowRight/></Link></div>}</div></div></section>
    {categories.length > 0 && <section className="section container"><header className="section-title"><p>Categorias</p><h2>Encontre o que combina com você</h2></header><div className="category-grid">{categories.map((category) => <Link key={category.slug} to={category.href} aria-label={category.name}><img src={category.image} alt={`Produto representativo de ${category.name}`} loading="lazy" width="560" height="360"/><span><span><b>{category.name}</b><em>{category.description}</em></span><small>Ver seleção <ArrowRight/></small></span></Link>)}</div></section>}
  </>
}
