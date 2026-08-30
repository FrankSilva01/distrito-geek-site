/**
 * Registra na vitrine anúncios reais do Mercado Livre que o FlowOps não conhece.
 *
 * POR QUE EXISTE
 *
 * O FlowOps só ATUALIZA anúncios já registrados nele — nunca descobre anúncio novo. Diagnóstico
 * de 30/08/2026: o painel do Mercado Livre tinha 48 anúncios e o FlowOps devolvia 52 registros,
 * mas três anúncios do painel não estavam lá (MLB7546463124, MLB7492964436 e MLB6940678098),
 * enquanto sete registros mortos continuavam no FlowOps. As corridas de atualização rodam e
 * mexem só em parte da lista (17 registros em 29/08, 28 em 23/08), o que também deixa registros
 * parados há semanas. Nada disso é problema da vitrine: ela está fiel ao que o upstream entrega.
 *
 * `listCuratedProducts` já prevê exatamente esta situação: ela junta o catálogo sincronizado com
 * o catálogo interno e o sincronizado GANHA em caso de id repetido. Então importar aqui é uma
 * ponte, não um catálogo paralelo — no dia em que o FlowOps registrar o anúncio, o registro dele
 * passa a valer sozinho e o que foi importado aqui é ignorado. O SKU DG continua vindo do
 * gerador (`assignSkus`), não deste arquivo.
 *
 * LIMITE QUE VEM JUNTO: o que entra por aqui é um retrato. Preço, estoque e fotos NÃO seguem o
 * Mercado Livre até o FlowOps assumir o anúncio. Se o preço mudar lá, atualize aqui ou registre
 * o anúncio no FlowOps.
 *
 * COMO OS OBJETOS ABAIXO FORAM PRODUZIDOS
 *
 * Passaram por `mapStorefrontProduct` de `src/integrations/storefront.ts`, o mesmo mapeador que
 * o sync usa, a partir de linhas no formato do FlowOps. Título, preço, imagens e descrição foram
 * lidos da página real de cada anúncio; o tamanho das descrições foi conferido contra a página.
 * Para regenerar depois de mudar algo no anúncio, reproduza a linha no formato `StorefrontListing`
 * e rode pelo mapeador em vez de editar o objeto à mão.
 *
 * USO (as credenciais ficam no seu shell, nunca no arquivo):
 *
 *   $env:DG_ADMIN_EMAIL    = "seu@email"
 *   $env:DG_ADMIN_PASSWORD = "sua-senha"
 *   node scripts/importar-anuncios-ausentes.mjs --dry-run   # mostra o que faria, sem gravar
 *   node scripts/importar-anuncios-ausentes.mjs             # importa
 */
const ORIGIN = process.env.DG_ORIGIN || 'https://distritogeek.com.br'
const EMAIL = process.env.DG_ADMIN_EMAIL
const PASSWORD = process.env.DG_ADMIN_PASSWORD
const DRY_RUN = process.argv.includes('--dry-run')

if (!DRY_RUN && (!EMAIL || !PASSWORD)) {
  console.error('Defina DG_ADMIN_EMAIL e DG_ADMIN_PASSWORD antes de importar (ou use --dry-run).')
  process.exit(1)
}

const AGORA = new Date().toISOString()

const produto = ({ id, title, price, images, description }) => ({
  id,
  // Mesma regra de slug de `src/integrations/storefront.ts`: o slug tem de bater com o que o
  // sync geraria, senão a URL do produto muda quando o FlowOps assumir o anúncio.
  slug: `${title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${id.toLowerCase()}`,
  title,
  marketplaceTitle: title,
  description,
  price,
  currency: 'BRL',
  stock: 10,
  status: 'published',
  category: 'miniaturas-rpg',
  images,
  attributes: { Marketplace: 'Mercado Livre' },
  featured: false,
  showOnStorefront: true,
  showOnHome: true,
  listings: [{ marketplace: 'mercado-livre', externalId: id, url: `https://produto.mercadolivre.com.br/MLB-${id.replace('MLB', '')}`, active: true }],
  version: 1,
  createdAt: AGORA,
  updatedAt: AGORA,
})

const KIT9 = [
  'KIT 9 CRIATURAS BESTIAIS RPG 32MM EM RESINA',
  'Monte encontros, grupos de inimigos e batalhas com um conjunto variado de criaturas humanoides bestiais para RPG de mesa, campanhas de fantasia, dungeon crawling e wargames.',
  'O kit reúne 9 miniaturas com diferentes silhuetas, equipamentos, armas e estilos de combate, oferecendo variedade visual para mestres, jogadores, colecionadores e pintores de miniaturas.',
  'CONTEÚDO',
  '9 miniaturas de criaturas bestiais\nModelos variados\nBases incluídas conforme os modelos apresentados nas fotos',
  'COMPATÍVEL COM',
  'RPG de mesa\nDungeons & Dragons\nPathfinder\nWargames\nDungeon crawlers\nAventuras de fantasia\nCombates contra monstros\nEncontros com criaturas\nPintura de miniaturas\nDioramas e coleções',
  'DIFERENCIAIS',
  'Conjunto com grande variedade visual\nCriaturas com diferentes armas, poses e equipamentos\nBoa opção para criar encontros completos de RPG\nMiniaturas produzidas em resina\nAlto nível de detalhes para pintura e personalização\nPodem representar inimigos, monstros, mercenários, chefes ou criaturas de diferentes regiões da campanha',
  'ESPECIFICAÇÕES',
  'Quantidade: 9 miniaturas\nMaterial: resina\nEscala: aproximadamente 32 mm\nAcabamento: sem pintura\nCondição de envio: lavadas e curadas\nPrimer: não aplicado\nProdução: impressão 3D em resina',
  'IMPORTANTE',
  'Produto produzido sob demanda.',
  'Prazo de preparação de até 5 dias antes do envio.',
  'As miniaturas são enviadas sem pintura e sem primer.',
  'A tonalidade da resina pode variar conforme a disponibilidade do material.',
  'Por se tratar de impressão 3D em resina, pequenos sinais de suporte ou acabamento podem estar presentes.',
  'A resina é um material rígido e peças finas devem ser manuseadas com cuidado.',
  'Produto compatível com diferentes sistemas de RPG e wargames. Não possui vínculo ou afiliação oficial com Dungeons & Dragons, Pathfinder ou seus respectivos detentores.',
  'Produzido pela 3D.AFT\nART • PRINT • COLLECT',
].join('\n\n')

const KIT5 = [
  'Kit com cinco criaturas demoníacas em escala aproximada de 32 mm, em resina, para RPG de mesa, wargames e pintura.',
  'São cinco criaturas distintas, e não cinco variações da mesma. Uma tem carapaça e seis garras em torno de uma boca circular dentada. Outra é um humanoide com um feixe de tentáculos no lugar de um dos braços. Há um brutamontes inchado, coberto de cracas e corais, arrastando uma âncora acorrentada. Há um humanoide magro e curvado empunhando uma vara longa. E há uma criatura anfíbia de cabeça de peixe, com uma pinça de crustáceo e um gancho. Cada silhueta é diferente o suficiente para a mesa reconhecer quem é quem de longe, o que transforma o grupo em elenco, e não em contagem de inimigos.',
  'As proporções variam de propósito: duas das peças são visivelmente maiores que as outras três e vêm em bases maiores. Isso ajuda a marcar hierarquia dentro do mesmo encontro, entre o chefe, a criatura de elite e os capangas.',
  'Os detalhes puxam para um tema aquático e subterrâneo: cracas, corais, cogumelos, âncora e gancho enferrujados. O kit funciona bem em pântanos, cavernas alagadas, portos abandonados e cultos costeiros, além de servir como aberrações e chefes de encontro em qualquer campanha de fantasia sombria.',
  'As peças chegam lavadas e curadas, mas sem pintura e sem primer. A preparação e o esquema de cor ficam na sua mão. As imagens em ambiente 3D mostram os modelos usados na impressão, e não peças pintadas.',
  'ESPECIFICAÇÕES',
  'Quantidade: 5 miniaturas\nEscala: aproximadamente 32 mm\nMaterial: Resina\nEstado: Sem pintura e sem primer\nLavagem e cura: feitas\nBases conforme os modelos apresentados\nProdução: impressão 3D em resina, sob demanda',
  'COMPATIBILIDADE',
  'RPG de mesa\nDungeons & Dragons (D&D)\nPathfinder\nWargames e dioramas',
  'CONTEÚDO DA EMBALAGEM',
  '5 miniaturas de criaturas demoníacas, em cinco modelos diferentes, com poses, tamanhos e bases variados',
  'INDICADO PARA',
  'Encontros com aberrações e criaturas do subterrâneo\nCampanhas de fantasia sombria, pântano e costa\nChefes de encontro e inimigos de elite\nMestres que precisam de silhuetas distinguíveis em campo\nPintores de miniatura',
  'IMPORTANTE',
  'Miniatura de resina pede manuseio com cuidado: pequenas marcas do processo de impressão e da remoção de suportes podem ocorrer. A tonalidade da resina varia conforme o material disponível na fabricação. Elementos usados apenas para compor as fotos não acompanham o produto. Produto não oficial, sem vínculo com Dungeons & Dragons, Pathfinder ou seus detentores de marca.',
].join('\n\n')

const PRODUTOS = [
  produto({
    id: 'MLB7546463124',
    title: 'Kit 9 Criaturas Bestiais Rpg 32mm Resina D&d Pathfinder',
    price: 189.9,
    description: KIT9,
    images: [
      'https://http2.mlstatic.com/D_NQ_NP_2X_747234-MLB116893737669_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_882134-MLB116893914893_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_837604-MLB116893798081_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_763184-MLB116893798433_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_623191-MLB116893014313_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_607200-MLB116893014627_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_845654-MLB116893739719_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_838872-MLB116893653383_082026-F.jpg',
    ],
  }),
  produto({
    id: 'MLB7492964436',
    title: 'Kit 5 Criaturas Demoníacas Rpg 32mm Resina D&d Pathfinder',
    price: 119.9,
    description: KIT5,
    images: [
      'https://http2.mlstatic.com/D_NQ_NP_2X_832156-MLB115216439264_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_948217-MLB115216439468_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_600417-MLB116617875687_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_858142-MLB116618018083_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_637338-MLB116617816609_082026-F.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_774845-MLB115216439958_082026-F.jpg',
    ],
  }),
]

// MLB6940678098 "Suporte Organizador Paletas de Maquiagem" também está no painel e fora do
// FlowOps, mas a página do anúncio responde "não está disponível". Importar criaria uma página
// pública sem canal de compra ativo, que é justamente o que o Admin marca como problema — então
// ele fica de fora até o anúncio voltar.

// Nada de publicar produto quebrado: as mesmas condições que `canPublishProduct` exige.
const OFICIAL = /^https:\/\/([a-z0-9-]+\.)*(mercadolivre\.com\.br|mercadolibre\.com)\//i
const problemas = []
for (const p of PRODUTOS) {
  if (p.title.trim().length < 8) problemas.push(`${p.id}: título curto`)
  if (p.description.trim().length < 20) problemas.push(`${p.id}: descrição curta`)
  if (!(p.price > 0)) problemas.push(`${p.id}: preço inválido`)
  if (!p.images.length || !p.images.every((url) => url.startsWith('https://'))) problemas.push(`${p.id}: imagem ausente ou não-https`)
  if (!p.listings.some((l) => l.active && OFICIAL.test(l.url))) problemas.push(`${p.id}: sem link oficial ativo`)
  if (/R\$/.test(p.description)) problemas.push(`${p.id}: preço escrito na descrição`)
}
if (problemas.length) {
  console.error('Abortado — o payload não passaria em canPublishProduct:\n  ' + problemas.join('\n  '))
  process.exit(1)
}

const publico = await fetch(`${ORIGIN}/api/catalog`).then((r) => r.json()).catch(() => ({ products: [] }))
const jaExiste = new Set((publico.products || []).map((p) => p.id))
const alvos = PRODUTOS.filter((p) => !jaExiste.has(p.id))
for (const p of PRODUTOS.filter((p) => jaExiste.has(p.id))) {
  console.log(`- ${p.id} já está no catálogo público (provavelmente o FlowOps assumiu) — nada a fazer.`)
}
if (!alvos.length) { console.log('\nNada a importar.'); process.exit(0) }

console.log(`\n${alvos.length} produto(s) para importar${DRY_RUN ? ' (dry-run)' : ''}:\n`)
for (const p of alvos) {
  console.log(`- ${p.id}  ${p.title}`)
  console.log(`    R$ ${p.price.toFixed(2)} | estoque ${p.stock} | ${p.images.length} imagens | descrição ${p.description.length} caracteres`)
  console.log(`    ${p.listings[0].url}`)
    console.log(`    slug: ${p.slug}`)
}
if (DRY_RUN) { console.log('\nDry-run: nada foi gravado.'); process.exit(0) }

const login = await fetch(`${ORIGIN}/api/admin-login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
if (!login.ok) { console.error(`Falha no login: HTTP ${login.status}`); process.exit(1) }
const cookie = login.headers.get('set-cookie')?.split(';')[0]
if (!cookie) { console.error('Login não devolveu cookie de sessão.'); process.exit(1) }

const response = await fetch(`${ORIGIN}/api/admin-import`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ products: alvos }),
})
const corpo = await response.text()
if (!response.ok) { console.error(`\nERRO: HTTP ${response.status} ${corpo.slice(0, 300)}`); process.exit(1) }
console.log(`\nOK — ${corpo}`)
console.log('Confira em /api/catalog; o SKU DG é gerado na primeira leitura do catálogo.')
