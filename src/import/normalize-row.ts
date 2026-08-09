import type { Marketplace, Product } from '../domain/product'

export type ImportResult = { row: number; ignored: boolean; product?: Product; errors: string[] }

const text = (value: unknown) => String(value ?? '').trim()
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const parseNumber = (value: unknown) => {
  const raw = text(value).replace(/R\$\s?/i, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function marketplaceOf(value: unknown): Marketplace {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('shopee')) return 'shopee'
  if (normalized.includes('mercado')) return 'mercado-livre'
  return 'other'
}

function listingUrl(marketplace: Marketplace, externalId: string) {
  if (marketplace === 'mercado-livre') return `https://produto.mercadolivre.com.br/${externalId}`
  if (marketplace === 'shopee') return 'https://shopee.com.br/'
  return ''
}

export function normalizeMarketplaceRow(row: Record<string, unknown>, index: number): ImportResult {
  const title = text(row.Título ?? row.Titulo)
  if (/^qa codex/i.test(title)) return { row: index, ignored: true, errors: [] }
  const externalId = text(row['ID Externo'] ?? row.ID)
  const marketplace = marketplaceOf(row.Marketplace)
  const errors: string[] = []
  if (!title) errors.push('Título obrigatório')
  if (!externalId) errors.push('ID externo obrigatório')
  const now = new Date('2026-08-08T00:00:00.000Z').toISOString()
  const paused = /pausad/i.test(text(row.Status))
  const product: Product = {
    id: externalId || `linha-${index}`, slug: slugify(title || `produto-${index}`), title,
    description: `Confira os detalhes de ${title} e compre com segurança no marketplace.`,
    price: parseNumber(row.Preço ?? row.Preco), currency: 'BRL', stock: Math.max(0, Math.trunc(parseNumber(row.Estoque))),
    status: paused ? 'paused' : 'draft', category: 'colecionaveis', images: [], attributes: {}, featured: false,
    listings: externalId ? [{ marketplace, externalId, url: listingUrl(marketplace, externalId), active: !paused }] : [],
    version: 1, createdAt: now, updatedAt: now,
  }
  return { row: index, ignored: false, product, errors }
}
