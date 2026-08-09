import { signSession, verifyPassword } from './_shared/auth'
import { friendlyError, json } from './_shared/http'

const attempts = new Map<string, { count: number; reset: number }>()
export default async (request: Request) => {
  if (request.method !== 'POST') return json({ message: 'Método não permitido.' }, 405)
  const ip = request.headers.get('x-nf-client-connection-ip') || 'unknown'
  const now = Date.now(), entry = attempts.get(ip)
  if (entry && entry.reset > now && entry.count >= 5) return json({ code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde alguns minutos.' }, 429)
  try {
    const { email, password } = await request.json()
    const valid = typeof email === 'string' && typeof password === 'string' &&
      email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && verifyPassword(password, process.env.ADMIN_PASSWORD_HASH || '')
    if (!valid) {
      attempts.set(ip, { count: (entry?.reset ?? 0) > now ? entry!.count + 1 : 1, reset: now + 15 * 60_000 })
      return json({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' }, 401)
    }
    attempts.delete(ip)
    const token = await signSession(email, process.env.SESSION_SECRET || '')
    return json({ ok: true }, 200, { 'set-cookie': `dg_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` })
  } catch (error) { return friendlyError(error) }
}
