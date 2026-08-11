import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from './seed-loader'

/**
 * Integridade dos dados internos do catalogo semente. Nao valida regra de negocio (isso e
 * catalog-health), e sim higiene do dado: titulos truncados, ids/slugs duplicados e nomes
 * degenerados que atrapalham SEO e o casamento produto->guia. O caso "Pathfind" (truncamento
 * de "Pathfinder") ja mordeu o ranking produto->guia uma vez.
 */
describe('integridade do catalogo semente', () => {
  const catalog = loadSeedCatalog()

  it('nao tem titulos com "Pathfinder" truncado', () => {
    const truncated = catalog.filter((product) => /\bpathfind\b/i.test(product.title) && !/pathfinder/i.test(product.title))
    expect(truncated.map((product) => product.title)).toEqual([])
  })

  it('nao repete id nem slug', () => {
    const ids = catalog.map((product) => product.id)
    const slugs = catalog.map((product) => product.slug)
    expect(new Set(ids).size, 'ids duplicados').toBe(ids.length)
    expect(new Set(slugs).size, 'slugs duplicados').toBe(slugs.length)
  })

  it('mantem titulos plausiveis: sem vazio, sem palavra colada gigante e sem caractere de controle', () => {
    for (const product of catalog) {
      expect(product.title.trim().length, `${product.slug} titulo vazio`).toBeGreaterThan(0)
      const hasControlChar = [...product.title].some((char) => char.charCodeAt(0) < 32)
      expect(hasControlChar, `${product.slug} caractere de controle`).toBe(false)
      const longestWord = Math.max(...product.title.split(/\s+/).map((word) => word.length))
      expect(longestWord, `${product.slug} palavra longa demais (provavel dado colado)`).toBeLessThanOrEqual(32)
    }
  })
})
