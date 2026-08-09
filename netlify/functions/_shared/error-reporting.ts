const REDACTED = '[redacted]'
const SENSITIVE_KEY = /email|senha|password|token|secret|session|authorization|cookie|api[-_]?key/i
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g

export type SentryDsn = { host: string; projectId: string; publicKey: string }

export function parseDsn(dsn: string | undefined): SentryDsn | null {
  if (!dsn) return null
  try {
    const url = new URL(dsn.trim())
    const projectId = url.pathname.replace(/^\//, '')
    if (url.protocol !== 'https:' || !url.username || !/^\d+$/.test(projectId)) return null
    return { host: url.host, projectId, publicKey: url.username }
  } catch { return null }
}

export const scrubText = (value: string) => value.replace(EMAIL_PATTERN, REDACTED)

/** Só a rota interessa para depurar; parâmetros que possam identificar alguém são mascarados. */
export function scrubUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const [key, param] of [...url.searchParams]) {
      if (SENSITIVE_KEY.test(key) || param.includes('@')) url.searchParams.set(key, REDACTED)
    }
    return `${url.origin}${url.pathname}${url.search}`
  } catch { return scrubText(value) }
}

export type FunctionErrorEvent = {
  event_id: string
  timestamp: string
  platform: 'node'
  level: 'error'
  environment: string
  logger: string
  tags: { function: string }
  exception: { values: Array<{ type: string; value: string }> }
  extra: { stack?: string; url?: string }
}

export function buildEvent(error: unknown, options: { functionName: string; eventId: string; timestamp: string; environment: string; url?: string }): FunctionErrorEvent {
  const failure = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido')
  return {
    event_id: options.eventId,
    timestamp: options.timestamp,
    platform: 'node',
    level: 'error',
    environment: options.environment,
    logger: options.functionName,
    tags: { function: options.functionName },
    exception: { values: [{ type: failure.name, value: scrubText(failure.message) }] },
    extra: {
      stack: failure.stack ? scrubText(failure.stack) : undefined,
      url: options.url ? scrubUrl(options.url) : undefined,
    },
  }
}

export const envelopeUrl = (dsn: SentryDsn) => `https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}&sentry_version=7`

export function buildEnvelope(event: FunctionErrorEvent): string {
  const header = JSON.stringify({ event_id: event.event_id, sent_at: event.timestamp })
  const body = JSON.stringify(event)
  return `${header}\n${JSON.stringify({ type: 'event', length: body.length })}\n${body}\n`
}

/**
 * Envia o erro para o Sentry sem SDK: o payload é montado campo a campo, então nada de
 * cabeçalho, cookie ou corpo de requisição escapa por instrumentação automática.
 * Sem SENTRY_DSN configurado é um no-op silencioso.
 */
export async function reportError(error: unknown, context: { functionName: string; url?: string }): Promise<boolean> {
  const dsn = parseDsn(process.env.SENTRY_DSN)
  if (!dsn) return false
  try {
    const event = buildEvent(error, {
      functionName: context.functionName,
      url: context.url,
      eventId: crypto.randomUUID().replaceAll('-', ''),
      timestamp: new Date().toISOString(),
      environment: process.env.SENTRY_ENVIRONMENT || process.env.CONTEXT || 'production',
    })
    const response = await fetch(envelopeUrl(dsn), {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body: buildEnvelope(event),
    })
    return response.ok
  } catch { return false }
}

/** Reporta falhas não tratadas sem alterar a resposta que o visitante recebe. */
export function withErrorReporting<Args extends unknown[]>(functionName: string, handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try { return await handler(...args) }
    catch (error) {
      const request = args[0]
      await reportError(error, { functionName, url: request instanceof Request ? request.url : undefined })
      throw error
    }
  }
}
