import { requireAdmin } from './_shared/auth'
import { acquisitionReport } from './_shared/google-analytics'
import { reportError, withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'

export default withErrorReporting('admin-analytics', async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method !== 'GET') return json({ message: 'Método não permitido.' }, 405)
    const period = Number(new URL(request.url).searchParams.get('period') || 28)
    return json(await acquisitionReport(period), 200, { 'cache-control': 'private, no-store' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const upstreamFailure = /Google|Analytics|Console|relatório/i.test(message)
    // Falha de autenticação é esperada e não vira alerta; falha de provedor é sinal real de confiabilidade.
    if (upstreamFailure) await reportError(error, { functionName: 'admin-analytics' })
    return friendlyError(error, upstreamFailure ? 502 : 401)
  }
})
