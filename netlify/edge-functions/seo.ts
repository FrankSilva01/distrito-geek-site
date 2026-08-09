type Product = { slug: string; title: string; storefrontTitle?: string; seoTitle?: string; description: string; seoDescription?: string; storefrontDescription?: string; images: string[] }
const ORIGIN = 'https://distritogeek.com.br'
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(request.url), response = await context.next()
  if (request.method !== 'GET' || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || !response.headers.get('content-type')?.includes('text/html')) return response
  let products: Product[] = []
  try { const result = await fetch(`${url.origin}/api/catalog`); if (result.ok) products = ((await result.json()) as { products?: Product[] }).products || [] } catch { /* generic metadata remains */ }
  const product = products.find((item) => url.pathname === `/produto/${item.slug}`)
  const title = product ? `${product.seoTitle || product.storefrontTitle || product.title} | Distrito Geek` : url.pathname === '/' ? 'Distrito Geek | Miniaturas RPG, Action Figures e ColecionÃ¡veis' : `${url.pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'Distrito Geek'} | Distrito Geek`
  const description = product?.seoDescription || product?.storefrontDescription || product?.description || 'Miniaturas RPG, action figures e colecionÃ¡veis selecionados. Compre no anÃºncio oficial do marketplace.'
  const canonical = `${ORIGIN}${url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')}`
  const image = product?.images[0] ? new URL(product.images[0], ORIGIN).href : `${ORIGIN}/assets/hero-distrito-geek.webp`
  const tags = `<title>${escape(title)}</title><meta name="description" content="${escape(description.slice(0, 160))}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description.slice(0, 160))}"><meta property="og:image" content="${escape(image)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="${product ? 'product' : 'website'}">`
  const body = (await response.text()).replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta name="description"[^>]*>/i, '').replace('</head>', `${tags}</head>`)
  const headers = new Headers(response.headers); headers.delete('content-length'); headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(body, { status: response.status, headers })
}
