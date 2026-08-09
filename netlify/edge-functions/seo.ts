import { injectMetadata } from '../../src/seo/edge-html.ts'
import { metadataForRoute } from '../../src/seo/metadata.ts'
import type { Product } from '../../src/domain/product.ts'

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(request.url)
  const response = await context.next()
  if (request.method !== 'GET' || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || !response.headers.get('content-type')?.includes('text/html')) return response
  let products: Product[] = []
  try {
    const catalogResponse = await fetch(`${url.origin}/api/catalog`, { headers: { accept: 'application/json' } })
    if (catalogResponse.ok) {
      const payload = await catalogResponse.json() as { products?: Product[] }
      products = Array.isArray(payload.products) ? payload.products : []
    }
  } catch { /* previously rendered generic metadata remains available */ }
  const body = injectMetadata(await response.text(), metadataForRoute(url.pathname, url.search, products))
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(body, { status: response.status, headers })
}
