import type { EdgePageMetadata } from './edge-html.ts'
import { GUIDES } from '../content/guides.ts'

const ORIGIN = 'https://distritogeek.com.br'
const LANDINGS: Record<string, [string, string]> = {
  '/miniaturas-rpg': ['Miniaturas RPG em Resina para D&D e Pathfinder', 'Explore miniaturas RPG em resina para D&D, Pathfinder e wargames, com detalhes e compra nos anúncios oficiais.'],
  '/miniaturas-dnd': ['Miniaturas para D&D em Resina', 'Miniaturas para aventuras de D&D, personagens e criaturas em resina com links para anúncios oficiais.'],
  '/miniaturas-pathfinder': ['Miniaturas Pathfinder para RPG', 'Conheça miniaturas compatíveis com campanhas de Pathfinder e outros sistemas de fantasia.'],
  '/miniaturas-rpg-32mm': ['Miniaturas RPG 32mm em Resina', 'Miniaturas RPG em escala aproximada de 32 mm para personagens, monstros e exércitos.'],
  '/miniaturas-resina': ['Miniaturas em Resina com Alto Nível de Detalhe', 'Veja miniaturas em resina para RPG, decoração e coleção, com imagens e condições dos anúncios oficiais.'],
  '/kits-rpg': ['Kits de Miniaturas RPG e Exércitos', 'Kits de miniaturas e exércitos para ampliar campanhas, encontros e coleções de RPG.'],
  '/action-figures': ['Action Figures e Colecionáveis Geek', 'Action figures, personagens e colecionáveis para decorar sua estante e ampliar sua coleção.'],
}
const ROUTES: Record<string, [string, string]> = {
  '/guias': ['Guias de Miniaturas, RPG e Colecionismo | Distrito Geek', 'Guias práticos sobre escala, pintura, conservação e escolha de miniaturas para RPG e coleção.'],
  '/': ['Distrito Geek | Miniaturas RPG, Action Figures e Colecionáveis', 'Miniaturas RPG, action figures e colecionáveis selecionados. Veja detalhes e compre no anúncio oficial do marketplace.'],
  '/categoria/todos': ['Catálogo Geek | Distrito Geek', 'Explore miniaturas RPG, action figures, kits e colecionáveis em anúncios oficiais.'],
  '/faq': ['Perguntas frequentes | Distrito Geek', 'Entenda como consultar produtos e finalizar sua compra no marketplace.'],
  '/contato': ['Contato | Distrito Geek', 'Fale com a equipe Distrito Geek sobre produtos, catálogo e atendimento.'],
  '/politica-de-privacidade': ['Política de Privacidade | Distrito Geek', 'Saiba como a Distrito Geek trata dados de contato e preferências de Analytics.'],
  '/termos': ['Termos de uso | Distrito Geek', 'Consulte as condições de uso da vitrine Distrito Geek.'],
  '/favoritos': ['Seus favoritos | Distrito Geek', 'Produtos que você salvou para consultar novamente.'],
  '/comparar': ['Comparar produtos | Distrito Geek', 'Compare os produtos selecionados antes de abrir o anúncio oficial.'],
}

export type EdgeProduct = { id?: string; sku?: string; slug: string; title: string; storefrontTitle?: string; seoTitle?: string; description: string; seoDescription?: string; storefrontDescription?: string; price: number; stock?: number; status?: string; category?: string; images: string[]; showOnStorefront?: boolean; listings?: Array<{ url: string; active: boolean; marketplace?: string; externalId?: string }> }
const absolute = (value: string) => new URL(value, ORIGIN).href
const concise = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 160)
const baseData = (): Record<string, unknown>[] => [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Distrito Geek', url: ORIGIN }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Distrito Geek', url: ORIGIN }]
const metadata = (title: string, description: string, canonical: string, robots: EdgePageMetadata['robots'], image = `${ORIGIN}/assets/hero-distrito-geek.webp`, type: EdgePageMetadata['type'] = 'website', structuredData: Record<string, unknown>[] = baseData()): EdgePageMetadata => ({ title: title.includes('| Distrito Geek') ? title : `${title} | Distrito Geek`, description: concise(description), canonical, robots, image, type, structuredData })

export function edgeMetadataForRoute(pathname: string, search: string, products: EdgeProduct[]) {
  const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '')
  const canonical = `${ORIGIN}${path}`
  const guide = path.startsWith('/guias/') ? GUIDES.find((item) => path === `/guias/${item.slug}`) : undefined
  if (guide) {
    const structuredData = [...baseData(), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: `${ORIGIN}/` }, { '@type': 'ListItem', position: 2, name: 'Guias', item: `${ORIGIN}/guias` }, { '@type': 'ListItem', position: 3, name: guide.title, item: canonical }] }, { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.seoDescription, datePublished: guide.updatedAt, dateModified: guide.updatedAt, mainEntityOfPage: canonical, author: { '@type': 'Organization', name: 'Distrito Geek' }, publisher: { '@type': 'Organization', name: 'Distrito Geek' } }]
    return { status: 200, metadata: metadata(guide.seoTitle, guide.seoDescription, canonical, 'index, follow', `${ORIGIN}/assets/hero-distrito-geek.webp`, 'article', structuredData) }
  }
  const product = products.find((item) => path === `/produto/${item.slug}` && item.status !== 'archived' && item.showOnStorefront !== false)
  if (product) {
    const name = product.seoTitle || product.storefrontTitle || product.title
    const description = product.seoDescription || product.storefrontDescription || product.description
    const listing = product.listings?.find((item) => item.active)
    // Breadcrumb com o mesmo nível de categoria que a ProductPage mostra (Início / categoria /
    // produto) e que o cliente emite — os três precisam concordar.
    const breadcrumb = [{ '@type': 'ListItem', position: 1, name: 'Início', item: `${ORIGIN}/` }, ...(product.category ? [{ '@type': 'ListItem', position: 2, name: product.category.replaceAll('-', ' '), item: `${ORIGIN}/categoria/${product.category}` }] : []), { '@type': 'ListItem', position: product.category ? 3 : 2, name, item: canonical }]
    const structuredData: Record<string, unknown>[] = [...baseData(), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb }]
    if (listing) structuredData.push({ '@context': 'https://schema.org', '@type': 'Product', name, image: product.images.map(absolute), description: concise(description), sku: product.sku || product.id || product.slug, url: canonical, category: product.category, offers: { '@type': 'Offer', priceCurrency: 'BRL', price: product.price, availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: listing.url } })
    return { status: 200, metadata: metadata(name, description, canonical, 'index, follow', absolute(product.images[0]), 'product', structuredData) }
  }
  const landing = LANDINGS[path]
  if (landing) return { status: 200, metadata: metadata(landing[0], landing[1], canonical, 'index, follow') }
  const route = ROUTES[path]
  if (route) return { status: 200, metadata: metadata(route[0], route[1], canonical, path === '/favoritos' || path === '/comparar' || (Boolean(search) && path.startsWith('/categoria/')) ? 'noindex, follow' : 'index, follow') }
  // Categoria específica é página funcional (catálogo filtrado), não de SEO: a landing do tema
  // (ex.: /miniaturas-rpg) é a página indexável. Fica noindex para não duplicar a intenção da
  // landing, alinhado ao cliente e ao sitemap. Só /categoria/todos indexa (tratado em ROUTES).
  if (path.startsWith('/categoria/') && products.some((item) => item.category && path === `/categoria/${item.category}`)) return { status: 200, metadata: metadata('Categoria de produtos', 'Explore produtos reais e abra o anúncio oficial no marketplace.', canonical, 'noindex, follow') }
  if (path.startsWith('/produto/') && products.length === 0) return { status: 200, metadata: metadata('Produto | Distrito Geek', 'Consulte detalhes e disponibilidade do produto.', canonical, 'index, follow') }
  return { status: 404, metadata: metadata('Página não encontrada | Distrito Geek', 'Essa aventura levou você para um lugar desconhecido.', canonical, 'noindex, follow') }
}
