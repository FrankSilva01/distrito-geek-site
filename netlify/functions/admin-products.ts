import { requireAdmin } from './_shared/auth'
import { editorialOverrideSchema, listCuratedProducts, listProducts, saveEditorialOverride, saveProducts } from './_shared/catalog-store'
import { withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'
import { canPublishProduct, productSchema } from '../../src/domain/product'

export default withErrorReporting('admin-products', async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method === 'GET') return json({ products: await listCuratedProducts() })
    if (request.method === 'PATCH') {
      const override = await saveEditorialOverride(editorialOverrideSchema.parse(await request.json()))
      return json({ override })
    }
    if (request.method !== 'PUT') return json({ message: 'Método não permitido.' }, 405)
    const products = await listProducts()
    const candidate = productSchema.parse(await request.json())
    const current = products.find((item) => item.id === candidate.id)
    if (current && current.version !== candidate.version) return json({ code: 'VERSION_CONFLICT', message: 'Este produto foi alterado em outra sessão. Recarregue antes de salvar.' }, 409)
    if (candidate.status === 'published' && !canPublishProduct(candidate)) return json({ code: 'INCOMPLETE_PRODUCT', message: 'Preencha descrição, preço, imagem e link válido antes de publicar.' }, 422)
    const saved = { ...candidate, version: candidate.version + 1, updatedAt: new Date().toISOString() }
    await saveProducts([...products.filter((item) => item.id !== saved.id), saved])
    return json({ product: saved })
  } catch (error) { return friendlyError(error, 401) }
})
