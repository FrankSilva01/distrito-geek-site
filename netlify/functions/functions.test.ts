// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { signSession, verifySession } from './_shared/auth'
import { publicCatalog } from './_shared/catalog-store'
import { loadSeedCatalog } from '../../src/data/seed-loader'

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
})
