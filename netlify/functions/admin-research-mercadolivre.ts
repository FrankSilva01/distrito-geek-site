import { requireAdmin } from './_shared/auth'
import { MlSearchError, mlConfigured, searchMercadoLivre } from './_shared/mercadolivre'
import { withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'

/**
 * Radar → pesquisa no Mercado Livre. Admin-only, no-store, NÃO persiste nada (a importação de
 * evidências vira uma nova ResearchSession pelo endpoint de oportunidades). Nunca retorna token.
 */
export default withErrorReporting('admin-research-mercadolivre', async (request: Request) => {
  try {
    await requireAdmin(request)
  } catch (error) {
    return friendlyError(error, 401)
  }
  if (request.method !== 'GET') return json({ message: 'Método não permitido.' }, 405)
  // Feature flag: sem credenciais, o Radar segue manual e a UI explica o estado.
  if (!mlConfigured()) return json({ configured: false, message: 'Mercado Livre não configurado.' }, 200)
  try {
    const url = new URL(request.url)
    const result = await searchMercadoLivre(url.searchParams.get('q') || '', url.searchParams.get('limit'))
    return json({ configured: true, ...result })
  } catch (error) {
    if (error instanceof MlSearchError) return json({ configured: true, code: error.code, message: error.message }, error.httpStatus)
    return json({ code: 'REQUEST_FAILED', message: 'Não foi possível consultar o Mercado Livre.' }, 502)
  }
})
