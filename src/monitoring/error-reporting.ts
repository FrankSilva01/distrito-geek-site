const REDACTED = '[redacted]'
const SENSITIVE_KEY = /email|senha|password|token|secret|session|authorization|cookie|api[-_]?key/i
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const MAX_EVENTS_PER_PAGE = 10

export type SentryDsn = { host: string; projectId: string; publicKey: string }

export function parseDsn(dsn: unknown): SentryDsn | null {
  if (typeof dsn !== 'string' || !dsn.trim()) return null
  try {
    const url = new URL(dsn.trim())
    const projectId = url.pathname.replace(/^\//, '')
    if (url.protocol !== 'https:' || !url.username || !/^\d+$/.test(projectId)) return null
    return { host: url.host, projectId, publicKey: url.username }
  } catch { return null }
}

export const scrubText = (value: string) => value.replace(EMAIL_PATTERN, REDACTED)

/** Mantém a rota e os filtros úteis, mas remove valores que possam identificar alguém. */
export function scrubUrl(value: string): string {
  try {
    const url = new URL(value, 'https://distritogeek.com.br')
    for (const [key, param] of [...url.searchParams]) {
      if (SENSITIVE_KEY.test(key) || param.includes('@')) url.searchParams.set(key, REDACTED)
    }
    return `${url.origin}${url.pathname}${url.search}`
  } catch { return scrubText(value) }
}

export type BrowserErrorEvent = {
  event_id: string
  timestamp: string
  platform: 'javascript'
  level: 'error'
  environment: string
  release?: string
  tags: { route: string }
  exception: { values: Array<{ type: string; value: string }> }
  extra: { stack?: string; url: string }
}

export function buildEvent(error: unknown, options: { eventId: string; timestamp: string; environment: string; release?: string; url: string }): BrowserErrorEvent {
  const failure = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido')
  const safeUrl = scrubUrl(options.url)
  return {
    event_id: options.eventId,
    timestamp: options.timestamp,
    platform: 'javascript',
    level: 'error',
    environment: options.environment,
    release: options.release,
    tags: { route: new URL(safeUrl).pathname },
    exception: { values: [{ type: failure.name, value: scrubText(failure.message) }] },
    extra: { stack: failure.stack ? scrubText(failure.stack) : undefined, url: safeUrl },
  }
}

export const envelopeUrl = (dsn: SentryDsn) => `https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}&sentry_version=7`

export function buildEnvelope(event: BrowserErrorEvent): string {
  const header = JSON.stringify({ event_id: event.event_id, sent_at: event.timestamp })
  const body = JSON.stringify(event)
  return `${header}\n${JSON.stringify({ type: 'event', length: body.length })}\n${body}\n`
}

export const errorSignature = (event: BrowserErrorEvent) => `${event.exception.values[0].type}:${event.exception.values[0].value}:${event.tags.route}`

let active: { dsn: SentryDsn; environment: string; release?: string } | null = null
let sent = 0
const seen = new Set<string>()

function report(error: unknown) {
  if (!active || sent >= MAX_EVENTS_PER_PAGE) return
  const event = buildEvent(error, {
    eventId: crypto.randomUUID().replaceAll('-', ''),
    timestamp: new Date().toISOString(),
    environment: active.environment,
    release: active.release,
    url: window.location.href,
  })
  const signature = errorSignature(event)
  if (seen.has(signature)) return
  seen.add(signature)
  sent += 1
  // keepalive garante o envio mesmo se o erro acontecer durante a saída da página.
  void fetch(envelopeUrl(active.dsn), { method: 'POST', headers: { 'content-type': 'application/x-sentry-envelope' }, body: buildEnvelope(event), keepalive: true }).catch(() => {})
}

const onError = (event: ErrorEvent) => report(event.error ?? event.message)
const onRejection = (event: PromiseRejectionEvent) => report(event.reason)

/**
 * Captura erro real do frontend sem SDK: o payload é montado campo a campo, então nada de
 * cookie, cabeçalho, entrada de formulário ou identificador de usuário é coletado.
 * Sem VITE_SENTRY_DSN configurado é um no-op e nenhum listener é registrado.
 */
export function initErrorReporting(env: Record<string, unknown> = import.meta.env): boolean {
  if (active) return true
  const dsn = parseDsn(env.VITE_SENTRY_DSN)
  if (!dsn) return false
  active = {
    dsn,
    environment: typeof env.VITE_SENTRY_ENVIRONMENT === 'string' && env.VITE_SENTRY_ENVIRONMENT ? env.VITE_SENTRY_ENVIRONMENT : 'production',
    release: typeof env.VITE_SENTRY_RELEASE === 'string' && env.VITE_SENTRY_RELEASE ? env.VITE_SENTRY_RELEASE : undefined,
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return true
}

export function resetErrorReportingForTests() {
  if (active) {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
  active = null
  sent = 0
  seen.clear()
}
