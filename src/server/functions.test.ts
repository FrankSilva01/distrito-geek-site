// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { signSession, verifySession } from '../../netlify/functions/_shared/auth'
import { applyEditorialOverrides, publicCatalog } from '../../netlify/functions/_shared/catalog-store'
import { loadSeedCatalog } from '../data/seed-loader'

describe('server security boundaries', () => {
  it('rejects a modified admin token', async () => {
    const token = await signSession('admin@distritogeek.com.br', 'a-secret-with-at-least-32-characters', new Date('2026-08-08T12:00:00Z'))
    await expect(verifySession(`${token}x`, 'a-secret-with-at-least-32-characters', new Date('2026-08-08T12:01:00Z'))).rejects.toThrow('Sessão inválida')
  })

  it('rejects expired sessions', async () => {
    const token = await signSession('admin@distritogeek.com.br', 'a-secret-with-at-least-32-characters', new Date('2026-08-08T12:00:00Z'))
    await expect(verifySession(token, 'a-secret-with-at-least-32-characters', new Date('2026-08-09T13:00:00Z'))).rejects.toThrow('Sessão expirada')
  })

  it('returns only published complete products to anonymous visitors', () => {
    const products = publicCatalog(loadSeedCatalog())
    expect(products).toHaveLength(36)
    expect(products.every((product) => product.status === 'published')).toBe(true)
  })

  it('merges editorial values without overwriting synchronized commerce data', () => {
    const synchronized = loadSeedCatalog()[0]
    const [curated] = applyEditorialOverrides([synchronized], [{
      id: synchronized.id,
      storefrontTitle: 'Kit RPG selecionado',
      storefrontDescription: 'Descrição editorial para o produto selecionado.',
      seoTitle: 'Kit RPG em Resina',
      seoDescription: 'Miniaturas selecionadas para sua próxima aventura.',
      seoTags: ['kit', 'rpg'],
      showOnStorefront: false,
      featured: true,
    }])
    expect(curated).toMatchObject({
      price: synchronized.price,
      listings: synchronized.listings,
      storefrontTitle: 'Kit RPG selecionado',
      storefrontDescription: 'Descrição editorial para o produto selecionado.',
      seoTitle: 'Kit RPG em Resina',
      seoTags: ['kit', 'rpg'],
      showOnStorefront: false,
      featured: true,
    })
  })

  it('excludes an editorially hidden product from the anonymous catalog', () => {
    const [product] = loadSeedCatalog()
    expect(publicCatalog([{ ...product, showOnStorefront: false }])).toEqual([])
  })
})
