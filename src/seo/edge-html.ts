export type EdgePageMetadata = { title: string; description: string; canonical: string; robots: 'index, follow' | 'noindex, follow'; image: string; type: 'website' | 'product' | 'article'; structuredData: Record<string, unknown>[] }

const attribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const json = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c')

export function injectMetadata(html: string, metadata: EdgePageMetadata): string {
  const tags = [
    `<title>${attribute(metadata.title)}</title>`,
    `<meta name="description" content="${attribute(metadata.description)}">`,
    `<meta name="robots" content="${attribute(metadata.robots)}">`,
    `<link rel="canonical" href="${attribute(metadata.canonical)}">`,
    `<meta property="og:title" content="${attribute(metadata.title)}">`,
    `<meta property="og:description" content="${attribute(metadata.description)}">`,
    `<meta property="og:image" content="${attribute(metadata.image)}">`,
    `<meta property="og:url" content="${attribute(metadata.canonical)}">`,
    `<meta property="og:type" content="${attribute(metadata.type)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script id="structured-data" type="application/ld+json">${json(metadata.structuredData)}</script>`,
  ].join('')
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]+(?:name=["'](?:robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, '')
    .replace(/<script[^>]+id=["']structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `${tags}</head>`)
}
