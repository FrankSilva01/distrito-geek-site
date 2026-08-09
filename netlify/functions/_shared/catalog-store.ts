import { getStore } from '@netlify/blobs'
import { canPublishProduct, productSchema, type Product } from '../../../src/domain/product'
import { loadStorefrontCatalog } from '../../../src/integrations/storefront'

const STORE_NAME = 'distrito-geek-catalog'
const INTERNAL_KEY = 'internal-products'
const CACHE_KEY = 'flowops-last-known-good'
const DEFAULT_STOREFRONT_URL = 'https://djvrhvzjvnyensbobtby.functions.supabase.co/storefront'

export function publicCatalog(products: Product[]): Product[] {
  return products.filter((product) => product.status === 'published' && canPublishProduct(product))
}

export async function listProducts(): Promise<Product[]> {
  try {
    const value = await getStore(STORE_NAME).get(INTERNAL_KEY, { type: 'json' })
    if (Array.isArray(value)) return value.map((item) => productSchema.parse(item))
  } catch { /* No internal catalog has been registered yet. */ }
  return []
}

export async function listPublicProducts(): Promise<Product[]> {
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
  return [...synchronized, ...internal.filter((item) => !realIds.has(item.id))]
}

export async function saveProducts(products: Product[]): Promise<void> {
  const validated = products.map((item) => productSchema.parse(item))
  await getStore(STORE_NAME).setJSON(INTERNAL_KEY, validated)
}
