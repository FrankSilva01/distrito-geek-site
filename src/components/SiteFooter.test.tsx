import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { isPublicProduct } from '../domain/storefront-presentation'
import { GUIDE_INDEX } from '../content/guides-index'
import { SEO_LANDINGS } from '../seo/landing-pages'
import { SiteFooter } from './SiteFooter'

/**
 * Os links de navegação do rodapé precisam apontar para rotas que existem e têm conteúdo. Já
 * houve link para /categoria/action-figures, uma categoria inexistente (as reais são
 * miniaturas-rpg e utilidades-geek), que renderizava catálogo vazio — o certo é a landing
 * /action-figures. Este teste guarda contra links de navegação quebrados ou mal-direcionados.
 */
describe('links do rodapé', () => {
  const publicProducts = loadSeedCatalog().filter(isPublicProduct)
  const guideSlugs = new Set(GUIDE_INDEX.map((guide) => guide.slug))
  const categories = new Set(publicProducts.map((product) => product.category))
  const landingPaths = new Set(SEO_LANDINGS.map((landing) => landing.path))
  const staticRoutes = new Set(['/', '/guias', '/faq', '/contato', '/politica-de-privacidade', '/termos', '/favoritos', '/comparar', '/categoria/todos'])

  const resolves = (path: string): boolean => {
    const clean = path.split(/[?#]/)[0]
    if (staticRoutes.has(clean) || landingPaths.has(clean)) return true
    const guide = clean.match(/^\/guias\/(.+)$/)
    if (guide) return guideSlugs.has(guide[1])
    const product = clean.match(/^\/produto\/(.+)$/)
    if (product) return publicProducts.some((item) => item.slug === product[1])
    const category = clean.match(/^\/categoria\/(.+)$/)
    if (category) return categories.has(category[1])
    return false
  }

  it('aponta todo link interno para uma rota válida com conteúdo', () => {
    const { container } = render(<MemoryRouter><SiteFooter /></MemoryRouter>)
    const internal = [...container.querySelectorAll('a[href^="/"]')].map((anchor) => anchor.getAttribute('href') || '')
    const broken = internal.filter((href) => !resolves(href))
    expect(broken, `links internos quebrados no rodapé: ${broken.join(', ')}`).toEqual([])
    // Sanidade: o rodapé de fato tem links internos (o seletor não ficou vazio por engano).
    expect(internal.length).toBeGreaterThan(5)
  })
})
