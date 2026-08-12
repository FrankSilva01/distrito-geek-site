import { listPublicProducts, publicCatalog } from './_shared/catalog-store'
import { reportError, withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'

export default withErrorReporting('catalog', async () => {
  // Cache curto de propósito: mudanças de visibilidade no Admin (publicar/ocultar/Home) precisam
  // refletir rápido no site. SWR longo fazia produto oculto continuar aparecendo por minutos.
  try { return json({ products: publicCatalog(await listPublicProducts()) }, 200, { 'cache-control': 'public, max-age=30, stale-while-revalidate=60' }) }
  catch (error) {
    await reportError(error, { functionName: 'catalog' })
    return json({ code: 'CATALOG_UNAVAILABLE', message: 'Não foi possível atualizar nosso catálogo agora.' }, 503, { 'cache-control': 'no-store' })
  }
})
