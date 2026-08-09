import assert from 'node:assert/strict'
import test from 'node:test'
import { inventoryChecks, runProductionSmoke } from './production-smoke.mjs'

test('inventoryChecks identifies unsafe catalog records', () => {
  assert.deepEqual(inventoryChecks([{ id: 'x', title: 'Produto', price: 0, images: [], listings: [] }]), [
    'Produto: sem imagem', 'Produto: sem link de compra ativo', 'Produto: preço inválido',
  ])
})

test('production smoke validates pages and a real catalog payload', async () => {
  const product = { id: '1', title: 'Mago', price: 49.9, images: ['https://img.test/mago.webp'], listings: [{ active: true, url: 'https://market.test/item' }] }
  const fetcher = async (url) => ({ ok: true, status: 200, json: async () => url.endsWith('/api/catalog') ? { products: [product] } : {} })
  const report = await runProductionSmoke('https://example.test/', fetcher)
  assert.equal(report.healthy, true)
  assert.equal(report.catalog.products, 1)
})
