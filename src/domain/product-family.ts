import { z } from 'zod'
import type { Product } from './product'
import { isPublicProduct } from './storefront-presentation'

export const relationTypeSchema = z.enum(['combina-com', 'compre-junto', 'complete-o-encontro', 'alternativa', 'mesma-familia'])
export const productRelationSchema = z.object({
  productId: z.string().trim().min(1),
  type: relationTypeSchema,
  priority: z.number().int().nonnegative().default(100),
})
export type ProductRelation = z.infer<typeof productRelationSchema>

export const productFamilySchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shortDescription: z.string().trim().min(20).max(300),
  image: z.string().optional(),
  productIds: z.array(z.string().trim().min(1)).min(1),
  priority: z.number().int().nonnegative().default(100),
  published: z.boolean(),
})
export type ProductFamily = z.infer<typeof productFamilySchema>

// Curadoria explícita: IDs confirmados no catálogo. Não há classificação por título/keyword.
export const CURATED_PRODUCT_FAMILIES: ProductFamily[] = [
  { id: 'family-goblins', name: 'Goblins', slug: 'goblins', shortDescription: 'Bandos e kits de goblins para encontros, exércitos e campanhas de fantasia.', productIds: ['MLB4866664485', 'MLB4866689669', 'MLB6827596444'], priority: 10, published: true },
  { id: 'family-mortos-vivos', name: 'Mortos-vivos', slug: 'mortos-vivos', shortDescription: 'Esqueletos, ghouls e tropas de mortos-vivos para encontros de RPG.', productIds: ['MLB4853120471', 'MLB4853123155', 'MLB7105247768', 'MLB7105284278', 'MLB7105512392', 'MLB4704760465'], priority: 20, published: true },
  // A ordem define o cross-sell: `relatedProductsFor` deriva a prioridade do índice em
  // productIds. Rochas primeiro faz Cristais e Árvores puxarem Rochas, e Rochas puxar
  // Cristais e Árvores — que é a relação comercial desejada entre as peças de terreno.
  { id: 'family-cenarios-rpg', name: 'Cenários RPG', slug: 'cenarios-rpg', shortDescription: 'Cenários e elementos de terreno para RPG de mesa, incluindo ruínas, florestas, pedras, cristais e outros elementos para compor encontros e mapas.', productIds: ['MLB7451208354', 'MLB7451226704', 'MLB5071806599', 'MLB7426771372', 'MLB7427034982'], priority: 25, published: true },
  { id: 'family-aventureiros', name: 'Aventureiros', slug: 'aventureiros', shortDescription: 'Grupos de personagens e guerreiros para formar equipes de aventureiros.', productIds: ['MLB4883770099', 'MLB4704621375', 'MLB4704637393', 'MLB6830409890'], priority: 30, published: true },
  // MLB4883900951 ("Miniatura De Orcs") está com anúncio finalizado no Mercado Livre e fora
  // do catálogo público; fica na lista porque `relatedProductsFor` já descarta o que não é
  // público, e o vínculo volta sozinho se o anúncio for reativado.
  { id: 'family-orcs', name: 'Orcs', slug: 'orcs', shortDescription: 'Miniaturas de orcs selecionadas para encontros e exércitos de RPG.', productIds: ['MLB7400799166', 'MLB4883900951'], priority: 40, published: true },
  { id: 'family-necromantes', name: 'Necromantes', slug: 'necromantes', shortDescription: 'Necromantes e conjuradores sombrios para campanhas e coleções de RPG.', productIds: ['MLB6830402558'], priority: 50, published: true },
  { id: 'family-vampiros', name: 'Vampiros', slug: 'vampiros', shortDescription: 'Vampiros em resina para encontros sombrios, pintura e colecionismo.', productIds: ['MLB4704692617'], priority: 60, published: true },
]

export function familyForProduct(productId: string, families: ProductFamily[]): ProductFamily | undefined {
  return families.filter((family) => family.published).sort((a, b) => a.priority - b.priority).find((family) => family.productIds.includes(productId))
}

export function relatedProductsFor(product: Product, catalog: Product[], families: ProductFamily[] = []): Array<{ product: Product; relation: ProductRelation }> {
  const byId = new Map(catalog.filter(isPublicProduct).map((item) => [item.id, item]))
  const seen = new Set<string>()
  const family = familyForProduct(product.id, families)
  const familyRelations: ProductRelation[] = (family?.productIds || []).filter((id) => id !== product.id).map((productId, index) => ({ productId, type: 'mesma-familia', priority: 100 + index }))
  return [...(product.relatedProducts || []), ...familyRelations]
    .filter((relation) => relation.productId !== product.id && !seen.has(relation.productId) && Boolean(byId.get(relation.productId)) && seen.add(relation.productId))
    .sort((a, b) => a.priority - b.priority)
    .map((relation) => ({ product: byId.get(relation.productId)!, relation }))
}
