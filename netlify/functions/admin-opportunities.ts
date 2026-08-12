import { randomUUID } from 'node:crypto'
import { requireAdmin } from './_shared/auth'
import { deleteOpportunity, listOpportunities, opportunityInputSchema, saveOpportunity } from './_shared/opportunity-store'
import { withErrorReporting } from './_shared/error-reporting'
import { friendlyError, json } from './_shared/http'

/** Radar de Oportunidades — endpoint admin-only e privado (no-store). Nunca no catálogo público. */
export default withErrorReporting('admin-opportunities', async (request: Request) => {
  try {
    await requireAdmin(request)
    if (request.method === 'GET') return json({ opportunities: await listOpportunities() })
    if (request.method === 'POST' || request.method === 'PUT') {
      const candidate = opportunityInputSchema.parse(await request.json())
      const opportunity = await saveOpportunity(candidate, { id: randomUUID(), now: new Date().toISOString() })
      return json({ opportunity })
    }
    if (request.method === 'DELETE') {
      const id = new URL(request.url).searchParams.get('id')
      if (!id) return json({ message: 'Informe o id da oportunidade.' }, 400)
      await deleteOpportunity(id)
      return json({ deleted: id })
    }
    return json({ message: 'Método não permitido.' }, 405)
  } catch (error) { return friendlyError(error, 401) }
})
