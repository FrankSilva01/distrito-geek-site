import { requireAdmin } from './_shared/auth'
import { json } from './_shared/http'
export default async (request: Request) => {
  if (request.method === 'DELETE') return json({ ok: true }, 200, { 'set-cookie': 'dg_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' })
  try { const session = await requireAdmin(request); return json({ authenticated: true, email: session.sub }) }
  catch { return json({ authenticated: false }, 401) }
}
