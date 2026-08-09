// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildEnvelope, buildEvent, envelopeUrl, parseDsn, reportError, scrubUrl } from '../../netlify/functions/_shared/error-reporting'

const DSN = 'https://abc123def456@o4507.ingest.us.sentry.io/4508'
const options = { functionName: 'catalog', eventId: '0'.repeat(32), timestamp: '2026-08-09T12:00:00.000Z', environment: 'production' }

describe('monitoramento de erros das Functions', () => {
  afterEach(() => { delete process.env.SENTRY_DSN; vi.unstubAllGlobals() })

  it('lê chave, host e projeto de um DSN válido e recusa os inválidos', () => {
    expect(parseDsn(DSN)).toEqual({ host: 'o4507.ingest.us.sentry.io', projectId: '4508', publicKey: 'abc123def456' })
    expect(parseDsn(undefined)).toBeNull()
    expect(parseDsn('http://abc@sentry.io/1')).toBeNull()
    expect(parseDsn('https://sentry.io/nao-numerico')).toBeNull()
  })

  it('monta o endpoint de envelope a partir do DSN', () => {
    expect(envelopeUrl(parseDsn(DSN)!)).toBe('https://o4507.ingest.us.sentry.io/api/4508/envelope/?sentry_key=abc123def456&sentry_version=7')
  })

  it('monta um evento com nome da função e sem dado pessoal', () => {
    const event = buildEvent(new Error('falha ao ler blob de franklin.alves@surf.com.br'), { ...options, url: 'https://distritogeek.com.br/api/catalog?token=abc' })
    expect(event.tags.function).toBe('catalog')
    expect(event.exception.values[0].value).toBe('falha ao ler blob de [redacted]')
    expect(event.extra.url).toContain('token=%5Bredacted%5D')
    expect(JSON.stringify(event)).not.toContain('surf.com.br')
  })

  it('gera um envelope com as três linhas que o Sentry espera', () => {
    const lines = buildEnvelope(buildEvent(new Error('falhou'), options)).split('\n')
    expect(JSON.parse(lines[0])).toEqual({ event_id: options.eventId, sent_at: options.timestamp })
    expect(JSON.parse(lines[1]).type).toBe('event')
    expect(JSON.parse(lines[2]).exception.values[0].value).toBe('falhou')
  })

  it('não envia nada quando SENTRY_DSN não está configurado', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(reportError(new Error('falhou'), { functionName: 'catalog' })).resolves.toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('envia o envelope quando há DSN e não propaga falha de rede', async () => {
    process.env.SENTRY_DSN = DSN
    const fetchSpy = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    await expect(reportError(new Error('falhou'), { functionName: 'catalog' })).resolves.toBe(true)
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/4508/envelope/')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede indisponível')))
    await expect(reportError(new Error('falhou'), { functionName: 'catalog' })).resolves.toBe(false)
  })

  it('preserva a rota ao mascarar a URL', () => {
    expect(scrubUrl('https://distritogeek.com.br/api/catalog?marketplace=shopee')).toBe('https://distritogeek.com.br/api/catalog?marketplace=shopee')
  })
})
