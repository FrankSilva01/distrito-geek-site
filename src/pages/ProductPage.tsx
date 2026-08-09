import { ArrowSquareOut, CheckCircle } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router-dom'
import { money, ProductCard } from '../components/ProductCard'
import { ProductGallery } from '../components/ProductGallery'
import { useCatalog } from '../data/catalog-provider'

export function ProductPage() {
  const { slug } = useParams(), all = useCatalog(), product = all.find((p) => p.slug === slug && p.status === 'published')
  if (!product) return <main className="container not-found"><h1>Produto não encontrado</h1><Link to="/categoria/todos">Voltar ao catálogo</Link></main>
  return <main className="container product-page"><div className="breadcrumbs">Início / {product.category} / {product.title}</div><div className="product-top"><ProductGallery images={product.images} title={product.title} /><section className="product-info"><p className="eyebrow">{product.category.replaceAll('-', ' ')}</p><h1>{product.title}</h1><div className="price">{money(product.price)}</div><p>ou em até 12x no marketplace</p><div className="chips"><span>Impressão 8K</span><span>Resina premium</span></div><ul><li><CheckCircle /> Compra protegida pelo marketplace</li><li><CheckCircle /> Consulte prazo e estoque no anúncio</li></ul>{product.listings.map((listing) => <a key={listing.externalId} className={`button buy ${listing.marketplace}`} href={listing.url} target="_blank" rel="noopener noreferrer">Comprar no {listing.marketplace === 'mercado-livre' ? 'Mercado Livre' : listing.marketplace} <ArrowSquareOut /></a>)}</section></div><section className="description"><h2>Descrição</h2><p>{product.description}</p><h3>Informações adicionais</h3><dl>{Object.entries(product.attributes).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section><section className="related"><h2>Produtos relacionados</h2><div className="product-grid">{all.filter((p) => p.status === 'published' && p.id !== product.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div></section></main>
}
