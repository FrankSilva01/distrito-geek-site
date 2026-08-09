import { injectMetadata } from '../../src/seo/edge-html.ts'
import { edgeMetadataForRoute, type EdgeProduct } from '../../src/seo/edge-metadata.ts'

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(request.url), response = await context.next()
  if (request.method !== 'GET' || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || !response.headers.get('content-type')?.includes('text/html')) return response
  let products: EdgeProduct[] = []
  try { const result = await fetch(`${url.origin}/api/catalog`); if (result.ok) products = ((await result.json()) as { products?: EdgeProduct[] }).products || [] } catch { /* metadata remains safe when the catalog is temporarily unavailable */ }
  const result = edgeMetadataForRoute(url.pathname, url.search, products)
  const body = injectMetadata(await response.text(), result.metadata)
  const headers = new Headers(response.headers); headers.delete('content-length'); headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(body, { status: result.status === 404 ? 404 : response.status, headers })
}
