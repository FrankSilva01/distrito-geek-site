import { getStore } from '@netlify/blobs'
import { canPublishProduct, productSchema, type Product } from '../../../src/domain/product'
import { isPublicProduct } from '../../../src/domain/storefront-presentation'
import { assignSkus, type SkuRegistry } from '../../../src/domain/sku'
import { loadStorefrontCatalog } from '../../../src/integrations/storefront'
import { z } from 'zod'

const STORE_NAME = 'distrito-geek-catalog'
const INTERNAL_KEY = 'internal-products'
const CACHE_KEY = 'flowops-last-known-good'
const EDITORIAL_KEY = 'storefront-editorial-overrides'
const SKU_REGISTRY_KEY = 'sku-registry'
const DEFAULT_STOREFRONT_URL = 'https://djvrhvzjvnyensbobtby.functions.supabase.co/storefront'

export function publicCatalog(products: Product[]): Product[] {
  return products.filter(isPublicProduct)
}

export const editorialOverrideSchema = z.object({
  id: z.string().min(1),
  storefrontTitle: z.string().trim().max(140).optional(),
  storefrontDescription: z.string().trim().max(5000).optional(),
  descriptionImages: z.array(z.string().url()).max(12).optional(),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  seoTags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  familyId: z.string().trim().min(1).optional(),
  relatedProducts: z.array(z.object({ productId: z.string().trim().min(1), type: z.enum(['combina-com', 'compre-junto', 'complete-o-encontro', 'alternativa', 'mesma-familia']), priority: z.number().int().nonnegative() })).max(24).optional(),
  homePriority: z.number().int().nonnegative().optional(),
  showOnStorefront: z.boolean(),
  showOnHome: z.boolean().optional(),
  featured: z.boolean(),
})
export type EditorialOverride = z.infer<typeof editorialOverrideSchema>

export function applyEditorialOverrides(products: Product[], overrides: EditorialOverride[]): Product[] {
  const byId = new Map(overrides.map((override) => [override.id, override]))
  return products.map((product) => {
    const override = byId.get(product.id)
    return override ? { ...product, ...override } : product
  })
}

export async function listEditorialOverrides(): Promise<EditorialOverride[]> {
  const value = await getStore(STORE_NAME).get(EDITORIAL_KEY, { type: 'json' }).catch(() => null)
  return Array.isArray(value) ? value.map((item) => editorialOverrideSchema.parse(item)) : []
}

export async function saveEditorialOverride(candidate: EditorialOverride): Promise<EditorialOverride> {
  const override = editorialOverrideSchema.parse(candidate)
  const current = await listEditorialOverrides()
  await getStore(STORE_NAME).setJSON(EDITORIAL_KEY, [...current.filter((item) => item.id !== override.id), override])
  return override
}

export async function listProducts(): Promise<Product[]> {
  try {
    const value = await getStore(STORE_NAME).get(INTERNAL_KEY, { type: 'json' })
    if (Array.isArray(value)) return value.map((item) => productSchema.parse(item))
  } catch { /* No internal catalog has been registered yet. */ }
  return []
}

export async function listCuratedProducts(): Promise<Product[]> {
  const store = getStore(STORE_NAME)
  let synchronized: Product[]
  try {
    synchronized = await loadStorefrontCatalog(process.env.FLOWOPS_STOREFRONT_URL || DEFAULT_STOREFRONT_URL)
    await store.setJSON(CACHE_KEY, synchronized)
  } catch (error) {
    const cached = await store.get(CACHE_KEY, { type: 'json' }).catch(() => null)
    if (!Array.isArray(cached)) throw error
    synchronized = cached.map((item) => productSchema.parse(item))
  }
  const internal = await listProducts()
  const realIds = new Set(synchronized.map((item) => item.id))
  const merged = [...synchronized, ...internal.filter((item) => !realIds.has(item.id))]
  const withOverrides = applyEditorialOverrides(merged, await listEditorialOverrides())
  // SKU DG permanente: gera para produto novo e persiste o registro; nunca regenera.
  const before = await listSkuRegistry()
  const { registry, products } = assignSkus(withOverrides, before)
  if (Object.keys(registry).length !== Object.keys(before).length) await getStore(STORE_NAME).setJSON(SKU_REGISTRY_KEY, registry).catch(() => {})
  return products
}

export async function listSkuRegistry(): Promise<SkuRegistry> {
  const value = await getStore(STORE_NAME).get(SKU_REGISTRY_KEY, { type: 'json' }).catch(() => null)
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as SkuRegistry) : {}
}

export async function listPublicProducts(): Promise<Product[]> {
  return listCuratedProducts()
}

export async function saveProducts(products: Product[]): Promise<void> {
  const validated = products.map((item) => productSchema.parse(item))
  await getStore(STORE_NAME).setJSON(INTERNAL_KEY, validated)
}
