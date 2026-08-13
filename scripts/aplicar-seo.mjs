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
  // Visibilidade vem do estado atual, nunca do arquivo de texto.
  const payload = {
    id,
    ...texto,
    showOnStorefront: atual.showOnStorefront !== false,
    showOnHome: atual.showOnHome !== false,
    featured: Boolean(atual.featured),
  }
  const response = await fetch(`${ORIGIN}/api/admin-products`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(payload),
  })
  if (response.ok) { ok += 1; console.log(`OK   ${id}`) }
  else console.error(`ERRO ${id}: HTTP ${response.status} ${(await response.text()).slice(0, 160)}`)
}

console.log(`\n${ok}/${aplicaveis.length} aplicados.`)
