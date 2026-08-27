/**
 * Aplica o texto editorial de scripts/seo-overrides.json aos produtos do catálogo.
 *
 * Por que existe: os campos seoTitle, seoDescription e storefrontDescription vivem nos
 * Netlify Blobs e só são editáveis pelo Admin. Colar 24 produtos × 3 campos à mão é lento
 * e propenso a erro.
 *
 * Segurança: `saveEditorialOverride` REESCREVE o override inteiro. Este script lê o estado
 * atual de cada produto em /api/catalog e preserva showOnStorefront, showOnHome e featured
 * como estão — só o texto muda. Sem isso, um PATCH incompleto despublicaria destaques em
 * silêncio.
 *
 * ATENCAO — corrida de escrita: cada PATCH faz read-modify-write do MESMO blob que guarda
 * TODOS os overrides (storefront-editorial-overrides), sem compare-and-swap. PATCHes disparados
 * em sequencia rapida leem a lista antes da escrita anterior ficar visivel e sobrescrevem um ao
 * outro em silencio, devolvendo HTTP 200. Isso foi observado em producao em 23/08/2026: dos tres
 * produtos aplicados, dois se perderam e so voltaram ao reaplicar um a um.
 *
 * Por isso este script aplica em serie e NAO em paralelo. Se for alterar, mantenha a serie e
 * confira o estado depois: /api/catalog tem cache de 30s com stale-while-revalidate de 60s,
 * entao a leitura logo apos gravar ainda pode mostrar o valor antigo — use /api/admin-products
 * com cache no-store para conferir de verdade.
 *
 * Uso (as credenciais ficam no seu shell, nunca no arquivo):
 *
 *   $env:DG_ADMIN_EMAIL    = "seu@email"
 *   $env:DG_ADMIN_PASSWORD = "sua-senha"
 *   node scripts/aplicar-seo.mjs --dry-run     # mostra o que faria, sem gravar
 *   node scripts/aplicar-seo.mjs               # aplica
 */
import { readFileSync } from 'node:fs'

const ORIGIN = process.env.DG_ORIGIN || 'https://distritogeek.com.br'
const EMAIL = process.env.DG_ADMIN_EMAIL
const PASSWORD = process.env.DG_ADMIN_PASSWORD
const DRY_RUN = process.argv.includes('--dry-run')

if (!DRY_RUN && (!EMAIL || !PASSWORD)) {
  console.error('Defina DG_ADMIN_EMAIL e DG_ADMIN_PASSWORD antes de aplicar (ou use --dry-run).')
  process.exit(1)
}

const overrides = JSON.parse(readFileSync(new URL('./seo-overrides.json', import.meta.url), 'utf8'))
delete overrides._leia

const catalog = await fetch(`${ORIGIN}/api/catalog`).then((response) => response.json())
const byId = new Map(catalog.products.map((product) => [product.id, product]))

const alvos = Object.entries(overrides).map(([id, texto]) => ({ id, texto, atual: byId.get(id) }))
const ausentes = alvos.filter((alvo) => !alvo.atual)
for (const alvo of ausentes) console.warn(`AVISO: ${alvo.id} não está no catálogo público — será ignorado.`)

const aplicaveis = alvos.filter((alvo) => alvo.atual)
console.log(`${aplicaveis.length} produto(s) para atualizar${DRY_RUN ? ' (dry-run)' : ''}.\n`)

for (const { id, texto, atual } of aplicaveis) {
  if (texto.showOnStorefront === false) {
    console.log(`- ${id}  ${atual.title}`)
    console.log(`    OCULTAR da vitrine${texto._motivo ? ` — ${texto._motivo}` : ''}`)
    continue
  }
  console.log(`- ${id}  ${atual.title}`)
  console.log(`    seoTitle       (${texto.seoTitle.length}): ${texto.seoTitle}`)
  console.log(`    seoDescription (${texto.seoDescription.length})`)
  console.log(`    storefrontDesc (${texto.storefrontDescription.length})`)
  if (texto.seoDescription.length > 165) console.warn('    ATENÇÃO: meta description acima de 165 caracteres.')
}

if (DRY_RUN) { console.log('\nDry-run: nada foi gravado.'); process.exit(0) }

const login = await fetch(`${ORIGIN}/api/admin-login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
if (!login.ok) { console.error(`Falha no login: HTTP ${login.status}`); process.exit(1) }
const cookie = login.headers.get('set-cookie')?.split(';')[0]
if (!cookie) { console.error('Login não devolveu cookie de sessão.'); process.exit(1) }

let ok = 0
for (const { id, texto, atual } of aplicaveis) {
  // Visibilidade vem do estado atual, a menos que o arquivo peça explicitamente para mudar.
  // Ocultar também tira de Home e de destaque: produto fora da vitrine não deve continuar
  // ocupando espaço nobre em lugar nenhum.
  const ocultar = texto.showOnStorefront === false
  const { _motivo, ...campos } = texto
  const payload = {
    id,
    ...campos,
    showOnStorefront: ocultar ? false : atual.showOnStorefront !== false,
    showOnHome: ocultar ? false : atual.showOnHome !== false,
    featured: ocultar ? false : Boolean(atual.featured),
  }
  const response = await fetch(`${ORIGIN}/api/admin-products`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(payload),
  })
  if (response.ok) { ok += 1; console.log(`OK   ${id}`) }
  else console.error(`ERRO ${id}: HTTP ${response.status} ${(await response.text()).slice(0, 160)}`)
}

console.log(`\n${ok}/${aplicaveis.length} aplicados.`)
