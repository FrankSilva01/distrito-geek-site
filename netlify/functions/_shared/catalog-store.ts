import { getStore } from '@netlify/blobs'
import seed from '../../../src/data/catalog.seed.json'
import { canPublishProduct, productSchema, type Product } from '../../../src/domain/product'

const validatedSeed = () => seed.map((item) => productSchema.parse(item))

export function publicCatalog(products: Product[]): Product[] {
  return products.filter((product) => product.status === 'published' && canPublishProduct(product))
}

export async function listProducts(): Promise<Product[]> {
  try {
    const value = await getStore('distrito-geek-catalog').get('products', { type: 'json' })
    if (Array.isArray(value)) return value.map((item) => productSchema.parse(item))
  } catch {
    // Seed is the safe read-only fallback during the first deploy/local Vite preview.
  }
  return validatedSeed()
}

export async function saveProducts(products: Product[]): Promise<void> {
  const validated = products.map((item) => productSchema.parse(item))
  await getStore('distrito-geek-catalog').setJSON('products', validated)
}
