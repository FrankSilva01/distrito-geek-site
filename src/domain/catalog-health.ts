import type { Product } from './product'

export type CatalogHealthIssue = { productId: string; title: string; severity: 'error' | 'warning'; kind: 'image' | 'listing' | 'price' | 'sync'; message: string }

export function catalogHealth(products: Product[], now = new Date()) {
  const issues: CatalogHealthIssue[] = []
  for (const product of products) {
    const title = product.storefrontTitle || product.marketplaceTitle || product.title
    if (!product.images.length) issues.push({ productId: product.id, title, severity: 'error', kind: 'image', message: 'Produto sem imagem principal.' })
    if (product.status === 'published' && !product.listings.some((listing) => listing.active)) issues.push({ productId: product.id, title, severity: 'error', kind: 'listing', message: 'Produto publicado sem anúncio ativo.' })
    if (product.price <= 0) issues.push({ productId: product.id, title, severity: 'error', kind: 'price', message: 'Preço inválido ou zerado.' })
    const ageDays = (now.getTime() - new Date(product.updatedAt).getTime()) / 86_400_000
    if (product.status === 'published' && ageDays > 7) issues.push({ productId: product.id, title, severity: 'warning', kind: 'sync', message: `Sem atualização há ${Math.floor(ageDays)} dias.` })
  }
  return {
    status: issues.some((issue) => issue.severity === 'error') ? 'attention' : issues.length ? 'warning' : 'healthy',
    checkedAt: now.toISOString(),
    totals: { products: products.length, published: products.filter((product) => product.status === 'published').length, errors: issues.filter((issue) => issue.severity === 'error').length, warnings: issues.filter((issue) => issue.severity === 'warning').length },
    issues,
  }
}
