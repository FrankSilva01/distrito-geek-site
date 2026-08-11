import { listPublicProducts, publicCatalog } from './_shared/catalog-store'
import { SEO_LANDINGS } from '../../src/seo/landing-pages'
// O sitemap só precisa de slug e data: usa o índice leve, não o corpo dos artigos.
import { GUIDE_INDEX as GUIDES } from '../../src/content/guides-index'
import { withErrorReporting } from './_shared/error-reporting'

const escape = (value: string) => value.replace(/[<>&'"]/g, (char) => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' })[char]!)

/**
 * Caminhos indexáveis do sitemap. Função pura para ser testável sem tocar o storage.
 * Não inclui rotas noindex (favoritos, comparar), admin, nem páginas de categoria específica
 * (`/categoria/<cat>`): estas são noindex — a página de SEO de cada tema é a landing
 * correspondente (ex.: `/miniaturas-rpg`), não a categoria, que duplicaria a intenção. Só o
 * hub `/categoria/todos` entra. Se uma rota noindex aparecer aqui, o teste de saúde SEO falha.
 */
export function sitemapPaths(products: Array<{ slug: string; category: string }>): string[] {
  const paths = ['/', '/categoria/todos', ...SEO_LANDINGS.map((landing) => landing.path), ...products.map((product) => `/produto/${product.slug}`), '/guias', ...GUIDES.map((guide) => `/guias/${guide.slug}`), '/faq', '/contato', '/politica-de-privacidade', '/termos']
  return [...new Set(paths)]
}

export default withErrorReporting('sitemap', async () => {
  const origin = 'https://distritogeek.com.br'
  const products = publicCatalog(await listPublicProducts()).filter((product) => product.status === 'published')
  const uniquePaths = sitemapPaths(products)
  const lastmodByPath = new Map(products.map((product) => [`/produto/${product.slug}`, product.updatedAt.slice(0, 10)]))
  GUIDES.forEach((guide) => lastmodByPath.set(`/guias/${guide.slug}`, guide.updatedAt))
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniquePaths.map((path) => `<url><loc>${escape(`${origin}${path}`)}</loc>${lastmodByPath.has(path) ? `<lastmod>${lastmodByPath.get(path)}</lastmod>` : ''}</url>`).join('')}</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } })
})
