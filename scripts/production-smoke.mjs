import { fileURLToPath } from 'node:url'

const DEFAULT_ORIGIN = 'https://distritogeek.com.br'

export function inventoryChecks(products) {
  const issues = []
  for (const product of products) {
    const label = product.storefrontTitle || product.title || product.id
    if (!product.images?.length) issues.push(`${label}: sem imagem`)
    if (!product.listings?.some((listing) => listing.active && /^https:\/\//.test(listing.url))) issues.push(`${label}: sem link de compra ativo`)
    if (!(product.price > 0)) issues.push(`${label}: preço inválido`)
  }
  return issues
}

export async function checkUrl(url, fetcher = fetch) {
  const response = await fetcher(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'DistritoGeek-Monitor/1.0' } })
  return { url, status: response.status, ok: response.ok }
}

export async function runProductionSmoke(origin = DEFAULT_ORIGIN, fetcher = fetch) {
  const base = origin.replace(/\/$/, '')
  const criticalUrls = [base, `${base}/categoria/todos`, `${base}/guias`, `${base}/sitemap.xml`, `${base}/robots.txt`]
  const pages = await Promise.all(criticalUrls.map((url) => checkUrl(url, fetcher)))
  const failedPages = pages.filter((entry) => !entry.ok)
  const catalogResponse = await fetcher(`${base}/api/catalog`, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'DistritoGeek-Monitor/1.0' } })
  if (!catalogResponse.ok) throw new Error(`Catálogo indisponível: HTTP ${catalogResponse.status}`)
  const payload = await catalogResponse.json()
  const products = Array.isArray(payload.products) ? payload.products : []
  const inventoryIssues = inventoryChecks(products)
  const sampledAssets = products.slice(0, 8).flatMap((product) => [product.images?.[0], product.listings?.find((listing) => listing.active)?.url]).filter(Boolean)
  const assets = await Promise.all(sampledAssets.map(async (url) => {
    try { return await checkUrl(url, fetcher) } catch (error) { return { url, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) } }
  }))
  return { checkedAt: new Date().toISOString(), origin: base, pages, catalog: { products: products.length, issues: inventoryIssues }, sampledAssets: assets, healthy: failedPages.length === 0 && products.length > 0 && inventoryIssues.length === 0 }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = await runProductionSmoke(process.env.MONITOR_ORIGIN || DEFAULT_ORIGIN)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (!report.healthy) process.exitCode = 1
}
