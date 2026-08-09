import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'

type Session = { sub: string; exp: number }
const encode = (value: string) => Buffer.from(value).toString('base64url')
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

export async function signSession(subject: string, secret: string, now = new Date()): Promise<string> {
  const payload = encode(JSON.stringify({ sub: subject, exp: now.getTime() + 12 * 60 * 60 * 1000 }))
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export async function verifySession(token: string | undefined, secret: string, now = new Date()): Promise<Session> {
  if (!token) throw new Error('Sessão inválida')
  const [payload, signature] = token.split('.')
  if (!payload || !signature) throw new Error('Sessão inválida')
  const expected = createHmac('sha256', secret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Sessão inválida')
  const session = JSON.parse(decode(payload)) as Session
  if (session.exp <= now.getTime()) throw new Error('Sessão expirada')
  return session
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function readCookie(request: Request, name: string): string | undefined {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
}

export async function requireAdmin(request: Request) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('Configuração administrativa indisponível')
  return verifySession(readCookie(request, 'dg_admin'), secret)
}
