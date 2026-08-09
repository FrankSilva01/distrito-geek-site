import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useCatalog } from '../data/catalog-provider'
import { metadataForRoute } from '../seo/metadata'

function upsert(selector: string, create: () => HTMLElement, attributes: Record<string, string>) {
  const element = document.querySelector(selector) as HTMLElement | null ?? create()
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
  if (!element.parentNode) document.head.appendChild(element)
}

export function Seo() {
  const { pathname, search } = useLocation()
  const products = useCatalog()
  useEffect(() => {
    const metadata = metadataForRoute(pathname, search, products)
    document.title = metadata.title
    upsert('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), { href: metadata.canonical })
    upsert('meta[name="description"]', () => document.createElement('meta'), { name: 'description', content: metadata.description })
    upsert('meta[name="robots"]', () => document.createElement('meta'), { name: 'robots', content: metadata.robots })
    ;[['og:title', metadata.title], ['og:description', metadata.description], ['og:image', metadata.image], ['og:url', metadata.canonical], ['og:type', metadata.type]].forEach(([property, content]) =>
      upsert(`meta[property="${property}"]`, () => document.createElement('meta'), { property, content }),
    )
    ;[['twitter:card', 'summary_large_image'], ['twitter:title', metadata.title], ['twitter:description', metadata.description], ['twitter:image', metadata.image]].forEach(([name, content]) =>
      upsert(`meta[name="${name}"]`, () => document.createElement('meta'), { name, content }),
    )
    let script = document.getElementById('structured-data') as HTMLScriptElement | null
    if (!script) { script = document.createElement('script'); script.id = 'structured-data'; script.type = 'application/ld+json'; document.head.appendChild(script) }
    script.text = JSON.stringify(metadata.structuredData)
  }, [pathname, search, products])
  return null
}
