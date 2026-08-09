import { z } from 'zod'

export const marketplaceSchema = z.enum(['mercado-livre', 'shopee', 'other'])
export type Marketplace = z.infer<typeof marketplaceSchema>

export function isAllowedMarketplaceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br') ||
      host === 'mercadolibre.com' || host.endsWith('.mercadolibre.com') ||
      host === 'shopee.com.br' || host.endsWith('.shopee.com.br')
  } catch {
    return false
  }
}

export const listingSchema = z.object({
  marketplace: marketplaceSchema,
  externalId: z.string().trim().min(1),
  url: z.string().refine(isAllowedMarketplaceUrl, 'URL de marketplace inválida'),
  active: z.boolean(),
})

export const productStatusSchema = z.enum(['draft', 'published', 'paused', 'archived'])
export type ProductStatus = z.infer<typeof productStatusSchema>
export type MarketplaceListing = z.infer<typeof listingSchema>

export const productSchema = z.object({
  id: z.string().min(1), slug: z.string().min(1), title: z.string().trim().min(1),
  marketplaceTitle: z.string().trim().optional(), storefrontTitle: z.string().trim().optional(),
  description: z.string(), price: z.number().nonnegative(), currency: z.literal('BRL'),
  stock: z.number().int().nonnegative(), status: productStatusSchema, category: z.string().min(1),
  images: z.array(z.string().refine((value) => value.startsWith('/') || z.url().safeParse(value).success, 'Imagem inválida')), attributes: z.record(z.string(), z.string()), featured: z.boolean(), showOnStorefront: z.boolean().default(true),
  listings: z.array(listingSchema), version: z.number().int().positive(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})

export type Product = z.infer<typeof productSchema>
export const publicProductSchema = productSchema.refine((product) => canPublishProduct(product))

export function canPublishProduct(product: Product): boolean {
  return product.title.trim().length >= 8 && product.description.trim().length >= 20 &&
    product.price > 0 && product.images.length > 0 &&
    product.listings.some((listing) => listing.active && isAllowedMarketplaceUrl(listing.url))
}
