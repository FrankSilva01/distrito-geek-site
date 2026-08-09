import { listPublicProducts, publicCatalog } from './_shared/catalog-store'

const escape = (value: string) => value.replace(/[<>&'"]/g, (char) => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' })[char]!)

export default async () => {
  const origin = 'https://distritogeek.com.br'
  const products = publicCatalog(await listPublicProducts()).filter((product) => product.status === 'published')
  const categories = [...new Set(products.map((product) => product.category))]
  const paths = ['/', '/categoria/todos', ...categories.map((category) => `/categoria/${category}`), ...products.map((product) => `/produto/${product.slug}`), '/faq', '/contato']
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(`${origin}${path}`)}</loc></url>`).join('')}</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } })
}
