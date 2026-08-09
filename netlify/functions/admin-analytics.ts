import { requireAdmin } from './_shared/auth'
import { acquisitionReport } from './_shared/google-analytics'
import { friendlyError, json } from './_shared/http'

export default async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method !== 'GET') return json({ message: 'MÃ©todo nÃ£o permitido.' }, 405)
    return json(await acquisitionReport(), 200, { 'cache-control': 'private, max-age=300' })
  } catch (error) { return friendlyError(error, 401) }
}
