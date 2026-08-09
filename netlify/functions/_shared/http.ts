export const json = (value: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
})
export const friendlyError = (error: unknown, status = 400) => json({ code: 'REQUEST_FAILED', message: error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.' }, status)
