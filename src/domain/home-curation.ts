import type { Product } from './product'
import { displayTitle, showsOnHome } from './storefront-presentation'

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
  const title = displayTitle(product).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/goblin/.test(title)) return 'goblin'
  return title
    .replace(/\b(kit|miniatura|miniaturas|rpg|resina|8k|32mm|d&d|pathfinder|figure|action)\b/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim().split(/\s+/).slice(0, 3).join('-')
}

export function selectHomeFeatured(products: Product[], limit = 8): Product[] {
  const candidates = products.filter((product) => showsOnHome(product) && !isUtility(product))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.updatedAt.localeCompare(a.updatedAt))
  const selected: Product[] = [], families = new Set<string>()
  const buckets = [
    candidates.filter(isActionFigure),
    candidates.filter((product) => isKit(product) && !isActionFigure(product)),
    candidates.filter((product) => !isActionFigure(product) && !isKit(product)),
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
  }).map(({ matches: _matches, ...category }) => category)
}
