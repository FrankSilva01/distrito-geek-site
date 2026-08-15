import { requireAdmin } from './_shared/auth'
import { withErrorReporting } from './_shared/error-reporting'
import { internalSearchReport } from './_shared/google-analytics'
import { friendlyError, json } from './_shared/http'

export default withErrorReporting('admin-searches', async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method !== 'GET') return json({ message: 'Método não permitido.' }, 405)
    const period = Number(new URL(request.url).searchParams.get('period') || 90)
    return json(await internalSearchReport(period), 200, { 'cache-control': 'private, no-store' })
  } catch (error) {
    const upstreamFailure = /Google|Analytics|relatório/i.test(error instanceof Error ? error.message : '')
    return friendlyError(error, upstreamFailure ? 502 : 401)
  }
})
