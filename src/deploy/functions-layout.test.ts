// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Netlify Functions package', () => {
  it('contains only deployable function filenames at its root', () => {
    const invalid = readdirSync('netlify/functions', { withFileTypes: true })
      .filter((entry) => entry.isFile() && !/^[a-z0-9_-]+\.ts$/i.test(entry.name))
      .map((entry) => entry.name)
    expect(invalid).toEqual([])
  })

  it('ships public crawl rules and canonical redirects', () => {
    const robots = readFileSync('public/robots.txt', 'utf8')
    const netlify = readFileSync('netlify.toml', 'utf8')
    expect(robots).toContain('Disallow: /admin')
    expect(robots).toContain('Sitemap: https://distritogeek.com.br/sitemap.xml')
    expect(netlify).toContain('https://distritogeek.com.br/:splat')
    expect(netlify).toContain('/.netlify/functions/sitemap')
  })

  it('allows the consented analytics providers in the CSP', () => {
    const netlify = readFileSync('netlify.toml', 'utf8')
    expect(netlify).toContain('https://www.googletagmanager.com')
    expect(netlify).toContain('https://www.google-analytics.com')
    expect(netlify).toContain('https://www.clarity.ms')
    expect(netlify).toContain('https://*.clarity.ms')
  })

  it('does not cache authenticated analytics responses', () => {
    const analyticsFunction = readFileSync('netlify/functions/admin-analytics.ts', 'utf8')
    expect(analyticsFunction).toContain("'cache-control': 'private, no-store'")
  })
})
