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

const productImageSchema = z.string().refine(
  (value) => value.startsWith('/') || z.url().safeParse(value).success,
  'Imagem inválida',
)

/** SKU próprio e permanente da Distrito Geek: `DG-<PREFIXO>-<sequência>`. Ver `domain/sku.ts`. */
export const skuSchema = z.string().regex(/^DG-[A-Z]{2,4}-\d{6}$/)

export const productSchema = z.object({
  id: z.string().min(1), slug: z.string().min(1), title: z.string().trim().min(1),
  // SKU DG é opcional no schema para retrocompatibilidade; a migração o atribui a quem não tem.
  sku: skuSchema.optional(),
  marketplaceTitle: z.string().trim().optional(), storefrontTitle: z.string().trim().optional(),
  storefrontDescription: z.string().trim().optional(), seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(), seoTags: z.array(z.string().trim().min(1)).optional(),
  description: z.string(), price: z.number().nonnegative(), currency: z.literal('BRL'),
  stock: z.number().int().nonnegative(), status: productStatusSchema, category: z.string().min(1),
  // Três conceitos independentes de visibilidade (ver domain/storefront-presentation.ts):
  // status published + showOnStorefront = PUBLICADO (público em todas as superfícies);
  // showOnHome = aparece na Home; featured = destaque na Home. showOnHome default true.
  images: z.array(productImageSchema), descriptionImages: z.array(productImageSchema).max(12).optional(), attributes: z.record(z.string(), z.string()), featured: z.boolean(), showOnStorefront: z.boolean().default(true), showOnHome: z.boolean().optional(),
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
