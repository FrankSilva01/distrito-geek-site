import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const input = process.argv[2]
if (!input) throw new Error('Informe o caminho da planilha CSV/XLS.')
const workbook = XLSX.readFile(path.resolve(input), { raw: false })
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const category = (title) => /rpg|miniatura|goblin|esqueleto|ghoul|wargame|resina|figure/i.test(title) ? 'miniaturas-rpg' : /action|anime/i.test(title) ? 'action-figures' : 'utilidades-geek'
const imageFor = (title, index) => /drag|cavaleiro/i.test(title) ? '/assets/dragao-cavaleiro.png' : /kit|exército|goblin/i.test(title) ? '/assets/kit-guerreiros.png' : index % 3 === 0 ? '/assets/miniatura-mago.png' : index % 3 === 1 ? '/assets/kit-guerreiros.png' : '/assets/dragao-cavaleiro.png'
const price = (value) => Number(String(value).replace(/R\$\s?/i, '').replace(/\./g, '').replace(',', '.')) || 0
const now = '2026-08-08T00:00:00.000Z'

const products = rows.flatMap((row, index) => {
  const title = String(row.Título || row.Titulo || row['TÃ­tulo'] || '').trim()
  if (!title || /^qa codex/i.test(title)) return []
  const externalId = String(row['ID Externo'] || '').trim()
  const paused = /paused|pausad/i.test(String(row.Status))
  const categorySlug = category(title)
  return [{
    id: externalId || `produto-${index + 1}`, slug: `${slugify(title)}-${externalId.toLowerCase()}`, title,
    description: `${title} com acabamento detalhado. Consulte todas as condições, medidas e disponibilidade diretamente no anúncio do Mercado Livre antes da compra.`,
    price: price(row.Preço || row.Preco || row['PreÃ§o']), currency: 'BRL', stock: Number(row.Estoque) || 1,
    status: paused ? 'paused' : 'published', category: categorySlug,
    images: [imageFor(title, index), '/assets/miniatura-mago.png', '/assets/kit-guerreiros.png'],
    attributes: { Material: /resina/i.test(title) ? 'Resina' : 'Consulte o anúncio', Marketplace: 'Mercado Livre' },
    featured: !paused && index < 8,
    listings: externalId ? [{ marketplace: 'mercado-livre', externalId, url: `https://produto.mercadolivre.com.br/${externalId.replace(/^MLB/, 'MLB-')}`, active: !paused }] : [],
    version: 1, createdAt: now, updatedAt: now,
  }]
})
const out = path.resolve('src/data/catalog.seed.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(products, null, 2) + '\n')
console.log(JSON.stringify({ sourceRows: rows.length, products: products.length, published: products.filter((p) => p.status === 'published').length, paused: products.filter((p) => p.status === 'paused').length }))
