import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useCatalog } from '../data/catalog-provider'
import { displayTitle } from '../domain/storefront-presentation'

const ORIGIN = 'https://distritogeek.com.br'
const HOME_TITLE = 'Distrito Geek | Miniaturas RPG, Action Figures e Colecionáveis'
const HOME_DESCRIPTION = 'Miniaturas RPG, action figures e colecionáveis selecionados. Veja detalhes e compre com segurança no anúncio oficial do marketplace.'

function upsert(selector: string, create: () => HTMLElement, attributes: Record<string, string>) {
  const element = document.querySelector(selector) as HTMLElement | null ?? create()
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
  if (!element.parentNode) document.head.appendChild(element)
}

export function Seo() {
  const { pathname } = useLocation()
  const products = useCatalog()
  useEffect(() => {
    const product = products.find((item) => pathname === `/produto/${item.slug}`)
    const category = pathname.startsWith('/categoria/') ? pathname.split('/').pop()?.replaceAll('-', ' ') : ''
    const routeMetadata: Record<string, [string, string]> = {
      '/categoria/todos': ['Catálogo Geek | Distrito Geek', 'Explore miniaturas RPG, action figures, kits e colecionáveis em anúncios oficiais.'],
      '/faq': ['Perguntas frequentes | Distrito Geek', 'Entenda como consultar produtos e finalizar sua compra com segurança no marketplace.'],
      '/contato': ['Contato | Distrito Geek', 'Fale com a equipe Distrito Geek sobre produtos, catálogo e atendimento.'],
      '/politica-de-privacidade': ['Política de Privacidade | Distrito Geek', 'Saiba como a Distrito Geek trata os dados necessários para contato e operação do catálogo.'],
      '/termos': ['Termos de uso | Distrito Geek', 'Consulte as condições de uso da vitrine Distrito Geek e das compras realizadas nos marketplaces.'],
    }
    const route = routeMetadata[pathname]
    const productTitle = product ? displayTitle(product) : ''
    const title = product ? `${productTitle} | Distrito Geek` : route?.[0] || (category && category !== 'todos' ? `${category.replace(/\b\w/g, (c) => c.toUpperCase())} | Distrito Geek` : HOME_TITLE)
    const description = product ? product.description.slice(0, 160) : route?.[1] || HOME_DESCRIPTION
    const url = `${ORIGIN}${pathname === '/' ? '/' : pathname}`
    const image = product?.images[0] ? new URL(product.images[0], ORIGIN).href : `${ORIGIN}/assets/hero-distrito-geek.webp`
    document.title = title
    upsert('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), { href: url })
    ;[['og:title', title], ['og:description', description], ['og:image', image], ['og:url', url], ['og:type', product ? 'product' : 'website']].forEach(([property, content]) => upsert(`meta[property="${property}"]`, () => document.createElement('meta'), { property, content }))
    upsert('meta[name="description"]', () => document.createElement('meta'), { name: 'description', content: description })
    let script = document.getElementById('structured-data') as HTMLScriptElement | null
    if (!script) { script = document.createElement('script'); script.id = 'structured-data'; script.type = 'application/ld+json'; document.head.appendChild(script) }
    const base = [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Distrito Geek', url: ORIGIN }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Distrito Geek', url: ORIGIN }]
    script.text = JSON.stringify(product ? [...base, { '@context': 'https://schema.org', '@type': 'Product', name: productTitle, image: product.images, description: product.description, offers: { '@type': 'Offer', priceCurrency: 'BRL', price: product.price, availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: product.listings.find((listing) => listing.active)?.url } }] : base)
  }, [pathname, products])
  return null
}
