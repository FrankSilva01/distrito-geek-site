import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { catalogHealth } from './catalog-health'

describe('catalog health', () => {
  const [base] = loadSeedCatalog()
  it('flags published products that cannot convert', () => {
    const result = catalogHealth([{ ...base, status: 'published', price: 0, images: [], listings: [], updatedAt: '2026-08-09T00:00:00.000Z' }], new Date('2026-08-09T12:00:00.000Z'))
    expect(result.status).toBe('attention')
    expect(result.issues.map((issue) => issue.kind)).toEqual(['image', 'listing', 'price'])
  })
  it('warns when a published product has not synchronized recently', () => {
    const result = catalogHealth([{ ...base, status: 'published', updatedAt: '2026-07-01T00:00:00.000Z' }], new Date('2026-08-09T00:00:00.000Z'))
    expect(result.issues.some((issue) => issue.kind === 'sync')).toBe(true)
  })
})
