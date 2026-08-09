import { Heart } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useCatalog } from '../data/catalog-provider'
import { useProductEngagement } from '../data/product-engagement'
import { isPublicProduct } from '../domain/storefront-presentation'

export function FavoritesPage() {
  const catalog = useCatalog()
  const { favoriteIds } = useProductEngagement()
  const products = favoriteIds.map((id) => catalog.find((product) => product.id === id && isPublicProduct(product))).filter(Boolean)
  return <main className="container page collection-page"><p className="eyebrow">Sua seleção</p><h1>Favoritos</h1><p>Guarde produtos para rever depois. Preço e disponibilidade continuam vindo do catálogo sincronizado.</p>{products.length ? <div className="product-grid">{products.map((product, index) => product && <ProductCard key={product.id} product={product} listName="favoritos" position={index + 1}/>)}</div> : <div className="empty collection-empty"><Heart/><h2>Nenhum favorito por enquanto</h2><p>Use o coração nos produtos para montar sua lista.</p><Link className="button primary" to="/categoria/todos">Explorar catálogo</Link></div>}</main>
}
