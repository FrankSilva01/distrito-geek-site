import seed from './catalog.seed.json'
import { productSchema, type Product } from '../domain/product'

export function loadSeedCatalog(): Product[] {
  return seed.map((item) => productSchema.parse(item))
}
