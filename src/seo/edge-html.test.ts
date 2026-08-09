// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { injectMetadata } from './edge-html'
import type { PageMetadata } from './metadata'

it('injects crawlable metadata and escapes untrusted content', () => {
  const metadata: PageMetadata = { title: 'Mago <RPG>', description: 'Peça "especial"', canonical: 'https://distritogeek.com.br/miniaturas-rpg', robots: 'index, follow', image: 'https://example.com/a.jpg', type: 'website', breadcrumbs: [], structuredData: [{ name: '</script>' }] }
  const result = injectMetadata('<html><head><title>Old</title><meta name="description" content="old"><link rel="canonical" href="https://distritogeek.com.br/"><meta name="robots" content="index"><meta property="og:title" content="old"><script id="structured-data" type="application/ld+json">{}</script></head><body></body></html>', metadata)
  expect(result).toContain('<title>Mago &lt;RPG&gt;</title>')
  expect(result).toContain('rel="canonical" href="https://distritogeek.com.br/miniaturas-rpg"')
  expect(result).not.toContain('</script></script>')
  expect(result.match(/rel="canonical"/g)).toHaveLength(1)
  expect(result.match(/name="robots"/g)).toHaveLength(1)
  expect(result).not.toContain('content="old"')
})
