import { ArrowRight, Clock, LockKey, Medal, Package, Printer, ShieldCheck, Storefront } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogStatus } from '../data/catalog-provider'
import { useProductEngagement } from '../data/product-engagement'
import { homeCategories, selectHomeFamilies, selectHomeFeatured, selectNewProducts } from '../domain/home-curation'
import { CURATED_PRODUCT_FAMILIES } from '../domain/product-family'
import { isPublicProduct } from '../domain/storefront-presentation'
import { clusterById, guideSummaryBySlug } from '../content/guides-index'

const HOME_GUIDE_SLUGS = ['miniaturas-rpg', 'como-escolher-miniaturas-pathfinder', 'como-ser-mestre-rpg']

/** Movimento curto quando cards entram na tela. O conteúdo já está visível — é só a "acomodação" do tema Arcade. */
function useArcadeSettle(deps: unknown[]) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.product-card, .category-grid a, .benefit-grid > div, .market-card, .home-guides-grid article'))
    nodes.forEach((node) => node.classList.add('pop'))
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('in')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.25 })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function HomePage() {
  const catalog = useCatalog(), { loading, error } = useCatalogStatus(), { recentIds } = useProductEngagement()
  const featured = selectHomeFeatured(catalog, 8), categories = homeCategories(catalog)
  const families = selectHomeFamilies(catalog, CURATED_PRODUCT_FAMILIES, 3)
  const alreadyShown = new Set([...featured, ...families.flatMap(({ products }) => products)].map((product) => product.id))
  const newProducts = selectNewProducts(catalog, catalog.length).filter((product) => !alreadyShown.has(product.id)).slice(0, 4)
  const recent = recentIds.map((id) => catalog.find((product) => product.id === id && isPublicProduct(product))).filter(Boolean).slice(0, 4)
  const hasShopee = catalog.some((product) => product.listings.some((listing) => listing.marketplace === 'shopee' && listing.active))
  const hasTikTok = catalog.some((product) => product.listings.some((listing) => listing.marketplace === 'tiktok' && listing.active))
  const homeGuides = HOME_GUIDE_SLUGS.map(guideSummaryBySlug).filter((guide) => guide !== undefined)
  const publicCount = catalog.filter(isPublicProduct).length
  const tickerItems = [...categories.map((category) => category.name), 'Loja oficial no Mercado Livre', 'Frete para todo o Brasil', 'Resina 8K', 'Compra protegida']
  useArcadeSettle([loading, featured.length, categories.length, families.length, newProducts.length, recent.length])
  return <>
    <section className="hero">
      <div className="hero-stars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
      <div className="container hero-content">
        <div className="hero-copy">
          <span className="hero-badge"><Storefront/> Vitrine oficial da loja no Mercado Livre</span>
          <p className="eyebrow">Miniaturas • RPG • Colecionáveis</p>
          <h1>SEU UNIVERSO GEEK<br/><em>COMEÇA AQUI</em></h1>
          <p>Miniaturas de RPG, action figures e colecionáveis da loja Distrito Geek. Veja tudo aqui e compre direto no Mercado Livre, com pagamento, frete e garantia protegidos.</p>
          <div className="actions"><Link className="button primary" to="/categoria/todos">Explorar catálogo</Link><Link className="button ghost" to="/faq">Como comprar</Link></div>
          <div className="hero-proof"><ShieldCheck/><span><b>Compra 100% no Mercado Livre</b>Preço, estoque e frete atualizados direto do anúncio oficial.</span></div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-hex-float">
            <div className="hero-hex-shadow"/>
            <div className="hero-hex-photo"/>
            <svg className="hero-hex-ring" viewBox="0 0 100 100"><polygon points="50,1 99,25.5 99,74.5 50,99 1,74.5 1,25.5" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/></svg>
          </div>
          {publicCount > 0 && <span className="hero-sticker">{publicCount} {publicCount === 1 ? 'produto' : 'produtos'}</span>}
        </div>
      </div>
    </section>
    <div className="arcade-ticker" aria-hidden="true"><div className="arcade-ticker-track">{[...tickerItems, ...tickerItems].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></div>
    <section className="benefits"><div className="container benefit-grid"><div><Printer/><span><b>Resina 8K</b>Alto nível de detalhes</span></div><div><Medal/><span><b>Produção sob demanda</b>Conforme disponibilidade</span></div><div><Package/><span><b>Envio para todo o Brasil</b>Compra e entrega pelo Mercado Livre</span></div><div><LockKey/><span><b>Compra segura</b>Finalizada no marketplace</span></div></div></section>
    {categories.length > 0 && <section className="section container"><header className="section-title"><p>Comprar por tipo</p><h2>Encontre sua próxima peça</h2><span>Só produtos reais e disponíveis na loja.</span></header><div className="category-grid">{categories.map((category) => <Link key={category.slug} to={category.href}><img src={category.image} alt={`Produto representativo de ${category.name}`} loading="lazy" width="560" height="360"/><span><span><b>{category.name}</b><em>{category.description}</em></span><small>{category.productCount} {category.productCount === 1 ? 'produto' : 'produtos'} <ArrowRight/></small></span></Link>)}</div></section>}
    <section className="section container"><header className="section-title"><p>Destaques da loja</p><h2>Os mais procurados</h2><span>Preço e estoque sincronizados com o anúncio no Mercado Livre.</span></header>{loading ? <div className="catalog-state" role="status">Atualizando catálogo…</div> : error ? <div className="catalog-state error" role="alert">{error}</div> : <div className="product-grid">{featured.map((product, index) => <ProductCard key={product.id} product={product} listId="home-destaques" position={index + 1}/>)}</div>}<div className="center"><Link className="button primary" to="/categoria/todos">Ver todos os produtos <ArrowRight/></Link></div></section>
    {families.length > 0 && <section className="home-families"><div className="section container"><header className="section-title left"><p>Monte a sua coleção</p><h2>Kits e famílias para completar a mesa</h2><span>Seleções montadas só com produtos reais da loja.</span></header><div className="home-family-list">{families.map(({ family, products }) => <article key={family.id}><header><span><small>Família</small><h3>{family.name}</h3><p>{family.shortDescription}</p></span><Link to={`/produto/${products[0].slug}`}>Explorar família <ArrowRight/></Link></header><div className="product-grid">{products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} listId={`home-familia-${family.slug}`} position={index + 1}/>)}</div></article>)}</div></div></section>}
    {newProducts.length > 0 && <section className="section container home-new"><header className="section-title left"><p>Novidades</p><h2>Recém-chegados à loja</h2><span>Ordenados pela data de entrada no catálogo.</span></header><div className="product-grid">{newProducts.map((product, index) => <ProductCard key={product.id} product={product} listId="home-novidades" position={index + 1}/>)}</div></section>}
    {recent.length > 0 && <section className="recent-section"><div className="section container"><header className="section-title left"><p>Continue de onde parou</p><h2>Vistos recentemente</h2><span>Os dados dos produtos continuam atualizados pelo catálogo.</span></header><div className="product-grid">{recent.map((product, index) => product && <ProductCard key={product.id} product={product} listId="home-recentes" position={index + 1}/>)}</div></div></section>}
    <section className="safe-section"><div className="container safe-layout"><header><p className="eyebrow">Compre com segurança</p><h2>Finalize sua compra no Mercado Livre</h2><p>Veja os produtos aqui e feche a compra na loja oficial: pagamento, frete e garantia pelo marketplace.</p></header><div className="market-grid"><div className="market-card mercado-livre"><b>Mercado Livre</b><span>Loja oficial Distrito Geek — preço, estoque e link sincronizados.</span><Link to="/categoria/todos">Ir para os anúncios <ArrowRight/></Link></div>{hasShopee && <div className="market-card shopee"><b>Shopee</b><span>Links cadastrados quando disponíveis.</span><Link to="/categoria/todos?marketplace=shopee">Ver anúncios <ArrowRight/></Link></div>}{hasTikTok && <div className="market-card tiktok-shop"><b>TikTok Shop</b><span>Anúncios reais cadastrados no catálogo.</span><Link to="/categoria/todos?marketplace=tiktok-shop">Ver anúncios <ArrowRight/></Link></div>}</div></div></section>
    {homeGuides.length > 0 && <section className="section container home-guides"><header className="section-title"><p>Aprenda antes de jogar</p><h2>Guias de miniaturas, RPG e mesa</h2><span>Do primeiro dado à campanha: miniaturas, RPG de mesa, D&D, Pathfinder, mestre e acessórios.</span></header><div className="home-guides-grid">{homeGuides.map((guide) => <article key={guide.slug}><small className="home-guide-time"><Clock/> {clusterById(guide.cluster)?.label} · {guide.readingMinutes} min</small><h3>{guide.title}</h3><Link to={`/guias/${guide.slug}`}>Ler guia <ArrowRight/></Link></article>)}</div><div className="center"><Link className="button primary" to="/guias">Ver todos os guias <ArrowRight/></Link></div></section>}
  </>
}
