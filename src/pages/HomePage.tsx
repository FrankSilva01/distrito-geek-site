import { ArrowRight, Clock, LockKey, Medal, Package, Printer, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogStatus } from '../data/catalog-provider'
import { useProductEngagement } from '../data/product-engagement'
import { homeCategories, selectHomeFeatured } from '../domain/home-curation'
import { isPublicProduct } from '../domain/storefront-presentation'
// Índice leve: a home só precisa de título, cluster e tempo de leitura dos guias.
import { clusterById, guideSummaryBySlug } from '../content/guides-index'

// Um guia por frente temática, para a home abrir cada intenção sem virar índice de blog.
const HOME_GUIDE_SLUGS = ['miniaturas-rpg', 'como-escolher-miniaturas-pathfinder', 'como-ser-mestre-rpg']

export function HomePage() {
  const catalog = useCatalog()
  const { loading, error } = useCatalogStatus()
  const { recentIds } = useProductEngagement()
  const featured = selectHomeFeatured(catalog, 8)
  const categories = homeCategories(catalog)
  const recent = recentIds.map((id) => catalog.find((product) => product.id === id && isPublicProduct(product))).filter(Boolean).slice(0, 4)
  const hasShopee = catalog.some((product) => product.listings.some((listing) => listing.marketplace === 'shopee' && listing.active))
  const homeGuides = HOME_GUIDE_SLUGS.map(guideSummaryBySlug).filter((guide) => guide !== undefined)
  return <>
    <section className="hero"><div className="container hero-content"><span className="hero-badge"><Sparkle/> Curadoria para colecionadores</span><p className="eyebrow">Miniaturas • RPG • Colecionáveis</p><h1>SEU UNIVERSO GEEK<br/><em>COMEÇA AQUI</em></h1><p>Descubra peças únicas, compare detalhes e compre diretamente nos anúncios oficiais dos marketplaces.</p><div className="actions"><Link className="button primary" to="/categoria/todos">Explorar catálogo</Link><Link className="button ghost" to="/faq">Como funciona</Link></div><div className="hero-proof"><ShieldCheck/><span><b>Compra no marketplace</b>Preço, disponibilidade e condições atualizados pela integração.</span></div></div></section>
    <section className="benefits"><div className="container benefit-grid"><div><Printer/><span><b>Resina 8K</b>Alto nível de detalhes</span></div><div><Medal/><span><b>Produção sob demanda</b>Conforme disponibilidade</span></div><div><Package/><span><b>Envio para todo o Brasil</b>Compra e entrega pelo marketplace</span></div><div><LockKey/><span><b>Compra segura</b>Finalizada no marketplace</span></div></div></section>
    {categories.length > 0 && <section className="section container"><header className="section-title"><p>Comprar por tipo</p><h2>Encontre sua próxima peça</h2><span>Seleções montadas somente com produtos reais disponíveis no catálogo.</span></header><div className="category-grid">{categories.map((category) => <Link key={category.slug} to={category.href}><img src={category.image} alt={`Produto representativo de ${category.name}`} loading="lazy" width="560" height="360"/><span><span><b>{category.name}</b><em>{category.description}</em></span><small>{category.productCount} {category.productCount === 1 ? 'produto' : 'produtos'} <ArrowRight/></small></span></Link>)}</div></section>}
    <section className="section container"><header className="section-title"><p>Destaques</p><h2>Produtos para a sua próxima aventura</h2><span>Itens reais, dentro do universo geek, com preço e anúncio sincronizados.</span></header>{loading ? <div className="catalog-state" role="status">Atualizando catálogo…</div> : error ? <div className="catalog-state error" role="alert">{error}</div> : <div className="product-grid">{featured.map((product, index) => <ProductCard key={product.id} product={product} listId="home-destaques" position={index + 1}/>)}</div>}<div className="center"><Link className="button primary" to="/categoria/todos">Ver catálogo completo <ArrowRight/></Link></div></section>
    {recent.length > 0 && <section className="recent-section"><div className="section container"><header className="section-title left"><p>Continue de onde parou</p><h2>Vistos recentemente</h2><span>Os dados dos produtos continuam atualizados pelo catálogo.</span></header><div className="product-grid">{recent.map((product, index) => product && <ProductCard key={product.id} product={product} listId="home-recentes" position={index + 1}/>)}</div></div></section>}
    <section className="safe-section"><div className="container safe-layout"><header><p className="eyebrow">Compre com segurança</p><h2>Escolha onde finalizar sua compra</h2><p>Veja os produtos aqui e finalize no marketplace de sua preferência.</p></header><div className="market-grid"><div className="market-card mercado-livre"><b>Mercado Livre</b><span>Preço, disponibilidade e link oficial sincronizados.</span><Link to="/categoria/todos">Ver anúncios <ArrowRight/></Link></div>{hasShopee && <div className="market-card shopee"><b>Shopee</b><span>Links cadastrados quando disponíveis.</span><Link to="/categoria/todos?marketplace=shopee">Ver anúncios <ArrowRight/></Link></div>}</div></div></section>
    {homeGuides.length > 0 && <section className="section container home-guides"><header className="section-title"><p>Aprenda antes de jogar</p><h2>Guias de miniaturas, RPG e mesa</h2><span>Do primeiro dado à campanha: miniaturas, RPG de mesa, D&D, Pathfinder, mestre e acessórios.</span></header><div className="home-guides-grid">{homeGuides.map((guide) => <article key={guide.slug}><small className="home-guide-time"><Clock/> {clusterById(guide.cluster)?.label} · {guide.readingMinutes} min</small><h3>{guide.title}</h3><Link to={`/guias/${guide.slug}`}>Ler guia <ArrowRight/></Link></article>)}</div><div className="center"><Link className="button primary" to="/guias">Ver todos os guias <ArrowRight/></Link></div></section>}
  </>
}
