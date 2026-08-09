import { catalogHealth } from '../../src/domain/catalog-health'
import { requireAdmin } from './_shared/auth'
import { listProducts } from './_shared/catalog-store'
import { withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'

export default withErrorReporting('admin-health', async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method !== 'GET') return json({ message: 'Método não permitido.' }, 405)
    return json(catalogHealth(await listProducts()), 200, { 'cache-control': 'private, no-store' })
  } catch (error) { return friendlyError(error, 401) }
})
