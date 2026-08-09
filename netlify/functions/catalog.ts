import { listProducts, publicCatalog } from './_shared/catalog-store'
import { friendlyError, json } from './_shared/http'

export default async () => {
  try { return json({ products: publicCatalog(await listProducts()) }, 200, { 'cache-control': 'public, max-age=60' }) }
  catch (error) { return friendlyError(error, 500) }
}
