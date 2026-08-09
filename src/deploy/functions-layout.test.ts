// @vitest-environment node
import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Netlify Functions package', () => {
  it('contains only deployable function filenames at its root', () => {
    const invalid = readdirSync('netlify/functions', { withFileTypes: true })
      .filter((entry) => entry.isFile() && !/^[a-z0-9_-]+\.ts$/i.test(entry.name))
      .map((entry) => entry.name)
    expect(invalid).toEqual([])
  })
})
