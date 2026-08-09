import { requireAdmin } from './_shared/auth'
import { acquisitionReport } from './_shared/google-analytics'
import { friendlyError, json } from './_shared/http'

export default async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method !== 'GET') return json({ message: 'Método não permitido.' }, 405)
    const period = Number(new URL(request.url).searchParams.get('period') || 28)
    return json(await acquisitionReport(period), 200, { 'cache-control': 'private, no-store' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return friendlyError(error, /Google|Analytics|Console|relatório/i.test(message) ? 502 : 401)
  }
}
