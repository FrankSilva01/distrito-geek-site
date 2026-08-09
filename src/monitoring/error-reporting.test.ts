import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildEnvelope, buildEvent, envelopeUrl, errorSignature, initErrorReporting, parseDsn, resetErrorReportingForTests, scrubText, scrubUrl } from './error-reporting'

const DSN = 'https://abc123def456@o4507.ingest.us.sentry.io/4508'
const options = { eventId: '0'.repeat(32), timestamp: '2026-08-09T12:00:00.000Z', environment: 'production', url: 'https://distritogeek.com.br/categoria/todos' }

describe('monitoramento de erros do frontend', () => {
  afterEach(() => { resetErrorReportingForTests(); vi.unstubAllGlobals() })

  it('lê chave, host e projeto de um DSN válido e recusa os inválidos', () => {
    expect(parseDsn(DSN)).toEqual({ host: 'o4507.ingest.us.sentry.io', projectId: '4508', publicKey: 'abc123def456' })
    expect(parseDsn(undefined)).toBeNull()
    expect(parseDsn('   ')).toBeNull()
    expect(parseDsn('http://abc@sentry.io/1')).toBeNull()
    expect(parseDsn('https://sentry.io/nao-numerico')).toBeNull()
  })

  it('não registra nenhum listener sem DSN configurado', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    expect(initErrorReporting({})).toBe(false)
    expect(addListener).not.toHaveBeenCalledWith('error', expect.anything())
    addListener.mockRestore()
  })

  it('mascara e-mail em texto livre', () => {
    expect(scrubText('falhou para franklin.alves@surf.com.br ao salvar')).toBe('falhou para [redacted] ao salvar')
  })

  it('preserva a rota e os filtros, mas mascara parâmetros sensíveis', () => {
    expect(scrubUrl('https://distritogeek.com.br/categoria/todos?marketplace=shopee')).toBe('https://distritogeek.com.br/categoria/todos?marketplace=shopee')
    expect(scrubUrl('https://distritogeek.com.br/admin?token=abc123')).toContain('token=%5Bredacted%5D')
    expect(scrubUrl('https://distritogeek.com.br/contato?de=alguem@exemplo.com')).toContain('de=%5Bredacted%5D')
  })

  it('monta um evento sem dado pessoal e etiquetado pela rota', () => {
    const event = buildEvent(new Error('falhou para franklin.alves@surf.com.br'), { ...options, url: 'https://distritogeek.com.br/admin?token=abc' })
    expect(event.tags.route).toBe('/admin')
    expect(event.exception.values[0].value).toBe('falhou para [redacted]')
    expect(JSON.stringify(event)).not.toContain('surf.com.br')
    expect(JSON.stringify(event)).not.toContain('token=abc')
  })

  it('gera um envelope com as três linhas que o Sentry espera', () => {
    const lines = buildEnvelope(buildEvent(new Error('falhou'), options)).split('\n')
    expect(JSON.parse(lines[0])).toEqual({ event_id: options.eventId, sent_at: options.timestamp })
    expect(JSON.parse(lines[1]).type).toBe('event')
    expect(JSON.parse(lines[2]).exception.values[0].value).toBe('falhou')
  })

  it('envia erro não tratado uma única vez por assinatura', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    expect(initErrorReporting({ VITE_SENTRY_DSN: DSN })).toBe(true)

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('quebrou'), message: 'quebrou' }))
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('quebrou'), message: 'quebrou' }))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toBe(envelopeUrl(parseDsn(DSN)!))
    expect(fetchSpy.mock.calls[0][1].keepalive).toBe(true)

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('outro problema'), message: 'outro problema' }))
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('distingue erros iguais em rotas diferentes', () => {
    const catalogo = buildEvent(new Error('falhou'), { ...options, url: 'https://distritogeek.com.br/categoria/todos' })
    const produto = buildEvent(new Error('falhou'), { ...options, url: 'https://distritogeek.com.br/produto/x' })
    expect(errorSignature(catalogo)).not.toBe(errorSignature(produto))
  })
})
