import type { Product } from './product'
import { displayTitle, showsOnHome } from './storefront-presentation'
import type { ProductFamily } from './product-family'

export type HomeCategory = {
  slug: 'miniaturas-rpg' | 'action-figures' | 'kits-exercitos'
  href: string
  name: string
  description: string
  image: string
  productCount: number
}

const isUtility = (product: Product) => product.category === 'utilidades-geek'
const isActionFigure = (product: Product) => product.category === 'action-figures' || /action figure|figure|pok[eé]mon|anime/i.test(displayTitle(product))
const isKit = (product: Product) => /\bkit\b|ex[eé]rcito|conjunto|miniaturas/i.test(displayTitle(product))

function familyKey(product: Product): string {
  return product.familyId || product.id
}

export type HomeFamily = { family: ProductFamily; products: Product[] }

export function selectHomeFamilies(products: Product[], families: ProductFamily[], limit = 3): HomeFamily[] {
  const publicById = new Map(products.filter(showsOnHome).map((product) => [product.id, product]))
  return families
    .filter((family) => family.published)
    .sort((a, b) => a.priority - b.priority)
    .map((family) => ({ family, products: family.productIds.map((id) => publicById.get(id)).filter((product): product is Product => Boolean(product)) }))
    .filter(({ products: matches }) => matches.length >= 2)
    .slice(0, limit)
}

export function selectNewProducts(products: Product[], limit = 4): Product[] {
  return products.filter((product) => showsOnHome(product) && !isUtility(product))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export function selectHomeFeatured(products: Product[], limit = 8): Product[] {
  const candidates = products.filter((product) => showsOnHome(product) && !isUtility(product))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.updatedAt.localeCompare(a.updatedAt))
  const selected: Product[] = [], families = new Set<string>()
  const buckets = [
    candidates.filter((product) => !isActionFigure(product) && !isKit(product)),
    candidates.filter((product) => isKit(product) && !isActionFigure(product)),
    candidates.filter(isActionFigure),
  ]
  while (selected.length < limit && buckets.some((bucket) => bucket.length)) {
    let progressed = false
    for (const bucket of buckets) {
      const next = bucket.find((product) => !families.has(familyKey(product)) && !selected.includes(product))
      if (!next) continue
      selected.push(next)
      families.add(familyKey(next))
      progressed = true
      if (selected.length === limit) break
    }
    if (!progressed) break
  }
  return selected
}

export function homeCategories(products: Product[]): HomeCategory[] {
  const publicProducts = products.filter((product) => showsOnHome(product) && !isUtility(product))
  const configurations = [
    { slug: 'miniaturas-rpg' as const, href: '/categoria/miniaturas-rpg', name: 'Miniaturas RPG', description: 'Heróis, monstros e criaturas para D&D, Pathfinder e outras campanhas.', matches: (product: Product) => product.category === 'miniaturas-rpg' && !isKit(product) },
    { slug: 'action-figures' as const, href: '/categoria/action-figures', name: 'Action Figures', description: 'Peças para coleção, decoração e exposição.', matches: isActionFigure },
    { slug: 'kits-exercitos' as const, href: '/categoria/miniaturas-rpg?colecao=kits', name: 'Kits e Exércitos', description: 'Conjuntos de miniaturas para RPG e wargames.', matches: isKit },
  ]
  return configurations.map((configuration) => {
    const matches = publicProducts.filter(configuration.matches)
    const representative = matches[0] || publicProducts[0]
    return { ...configuration, image: representative?.images[0] || '/assets/product-placeholder.webp', productCount: matches.length }
  }).filter((category) => category.productCount > 0).map(({ matches: _matches, ...category }) => category)
}
