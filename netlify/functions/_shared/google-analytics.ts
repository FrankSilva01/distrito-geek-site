import { createSign } from 'node:crypto'

const base64url = (value: string) => Buffer.from(value).toString('base64url')

async function accessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({ iss: clientEmail, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey.replace(/\\n/g, '\n'), 'base64url')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }) })
  if (!response.ok) throw new Error('NÃ£o foi possÃ­vel autenticar o relatÃ³rio do Google Analytics.')
  return (await response.json() as { access_token: string }).access_token
}

export async function acquisitionReport() {
  const property = process.env.GA4_PROPERTY_ID, clientEmail = process.env.GA4_CLIENT_EMAIL, privateKey = process.env.GA4_PRIVATE_KEY
  if (!property || !clientEmail || !privateKey) return { configured: false, totals: { users: 0, sessions: 0 }, channels: [] }
  const token = await accessToken(clientEmail, privateKey)
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }] }) })
  if (!response.ok) throw new Error('O Google Analytics ainda nÃ£o liberou o relatÃ³rio solicitado.')
  const data = await response.json() as { rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> }
  const channels = (data.rows || []).map((row) => ({ channel: row.dimensionValues[0]?.value || 'Outros', users: Number(row.metricValues[0]?.value || 0), sessions: Number(row.metricValues[1]?.value || 0) }))
  return { configured: true, totals: { users: channels.reduce((sum, item) => sum + item.users, 0), sessions: channels.reduce((sum, item) => sum + item.sessions, 0) }, channels }
}
