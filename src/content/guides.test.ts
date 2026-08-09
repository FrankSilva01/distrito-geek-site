import { describe, expect, it } from 'vitest'
import { GUIDES } from './guides'

describe('editorial SEO guides', () => {
  it('publishes a complete initial topic cluster with unique metadata', () => {
    expect(GUIDES).toHaveLength(5)
    expect(new Set(GUIDES.map((guide) => guide.slug)).size).toBe(GUIDES.length)
    expect(new Set(GUIDES.map((guide) => guide.seoTitle)).size).toBe(GUIDES.length)
    for (const guide of GUIDES) {
      const words = [guide.intro, ...guide.sections.flatMap((section) => [section.body, ...(section.items || [])]), ...guide.faq.flatMap((item) => [item.question, item.answer])].join(' ').split(/\s+/).length
      expect(guide.seoDescription.length).toBeGreaterThanOrEqual(100)
      expect(guide.seoDescription.length).toBeLessThanOrEqual(160)
      expect(guide.sections.length).toBeGreaterThanOrEqual(4)
      expect(guide.faq.length).toBeGreaterThanOrEqual(2)
      expect(guide.relatedGuideSlugs.length).toBeGreaterThanOrEqual(2)
      expect(words).toBeGreaterThanOrEqual(350)
    }
  })
})
