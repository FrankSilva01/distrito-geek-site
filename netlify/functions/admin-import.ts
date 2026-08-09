import { requireAdmin } from './_shared/auth'
import { listProducts, saveProducts } from './_shared/catalog-store'
import { withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'
import { productSchema } from '../../src/domain/product'

export default withErrorReporting('admin-import', async (request: Request) => {
  try {
    await requireAdmin(request)
    const body = await request.json() as { products?: unknown[] }
    const accepted = (body.products || []).map((item) => productSchema.safeParse(item)).filter((result) => result.success).map((result) => result.data)
    if (!accepted.length) return json({ code: 'NO_VALID_ROWS', message: 'Nenhuma linha válida para importar.' }, 422)
    const existing = await listProducts(), ids = new Set(accepted.map((item) => item.id))
    await saveProducts([...existing.filter((item) => !ids.has(item.id)), ...accepted])
    return json({ accepted: accepted.length, rejected: (body.products?.length || 0) - accepted.length })
  } catch (error) { return friendlyError(error, 401) }
})
