import { getConsent } from './events'

export type ListOrigin = { list_name: string; position: number }
const STORAGE_KEY = 'distrito-geek:list-origin'
const MAX_ENTRIES = 20

function readStore(): Record<string, ListOrigin> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, ListOrigin> : {}
  } catch { return {} }
}

function isOrigin(value: unknown): value is ListOrigin {
  if (!value || typeof value !== 'object') return false
  const origin = value as Partial<ListOrigin>
  return typeof origin.list_name === 'string' && origin.list_name.length > 0 && Number.isInteger(origin.position) && (origin.position as number) > 0
}

/** Guarda de qual lista e posição o visitante saiu rumo ao produto, para atribuir o clique externo depois. */
export function rememberListOrigin(productId: string, origin: ListOrigin): boolean {
  if (getConsent() !== 'granted' || !productId || !isOrigin(origin)) return false
  try {
    const store = readStore()
    delete store[productId]
    store[productId] = { list_name: origin.list_name, position: origin.position }
    const keys = Object.keys(store).slice(-MAX_ENTRIES)
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(keys.map((key) => [key, store[key]]))))
    return true
  } catch { return false }
}

export function readListOrigin(productId: string): ListOrigin | null {
  if (!productId) return null
  const origin = readStore()[productId]
  return isOrigin(origin) ? origin : null
}

export function clearListOrigins() {
  try { window.sessionStorage.removeItem(STORAGE_KEY) } catch { /* sessionStorage indisponível: atribuição é opcional */ }
}
