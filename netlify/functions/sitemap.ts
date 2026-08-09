import { listPublicProducts, publicCatalog } from './_shared/catalog-store'
import { SEO_LANDINGS } from '../../src/seo/landing-pages'
import { GUIDES } from '../../src/content/guides'

const escape = (value: string) => value.replace(/[<>&'"]/g, (char) => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' })[char]!)

export default async () => {
  const origin = 'https://distritogeek.com.br'
  const products = publicCatalog(await listPublicProducts()).filter((product) => product.status === 'published')
  const categories = [...new Set(products.map((product) => product.category))]
  const paths = ['/', '/categoria/todos', ...SEO_LANDINGS.map((landing) => landing.path), ...categories.map((category) => `/categoria/${category}`), ...products.map((product) => `/produto/${product.slug}`), '/guias', ...GUIDES.map((guide) => `/guias/${guide.slug}`), '/faq', '/contato', '/politica-de-privacidade', '/termos']
  const uniquePaths = [...new Set(paths)]
  const lastmodByPath = new Map(products.map((product) => [`/produto/${product.slug}`, product.updatedAt.slice(0, 10)]))
  GUIDES.forEach((guide) => lastmodByPath.set(`/guias/${guide.slug}`, guide.updatedAt))
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniquePaths.map((path) => `<url><loc>${escape(`${origin}${path}`)}</loc>${lastmodByPath.has(path) ? `<lastmod>${lastmodByPath.get(path)}</lastmod>` : ''}</url>`).join('')}</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } })
}
