import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seed-loader'
import { filterAndSortProducts, normalizeCatalogIntent, priceRanges, zeroResultOptions, type CatalogSort } from './catalog-filters'

describe('catalog filters', () => {
  const [base] = loadSeedCatalog()

  it('normaliza intenções equivalentes sem NLP ou matching agressivo', () => {
    expect(normalizeCatalogIntent('  Órcs ')).toBe('orc')
    expect(normalizeCatalogIntent('32 mm')).toBe('32mm')
    expect(normalizeCatalogIntent('miniaturas')).toBe('miniatura')
    expect(normalizeCatalogIntent('moedas')).toBe('moeda')
    expect(normalizeCatalogIntent('TÓKENS')).toBe('token')
  })

  it('derives only useful price ranges from public product prices', () => {
    const products = [
      { ...base, id: 'low', price: 21.9 },
      { ...base, id: 'middle', price: 94.9 },
      { ...base, id: 'high', price: 750 },
    ]
    expect(priceRanges(products).map((range) => range.label)).toEqual(['Até R$ 50', 'R$ 50–100', 'Acima de R$ 400'])
  })

  it('searches the original marketplace title and sorts without mutating input', () => {
    const products = [
      { ...base, id: 'expensive', price: 200, marketplaceTitle: 'Dragão ancestral' },
      { ...base, id: 'cheap', price: 50, marketplaceTitle: 'Goblin arqueiro' },
    ]
    const original = products.map((product) => product.id)
    expect(filterAndSortProducts(products, { query: 'goblin', category: 'todos', priceRange: 'all', sort: 'menor-preco' }).map((product) => product.id)).toEqual(['cheap'])
    expect(products.map((product) => product.id)).toEqual(original)
  })

  it('filters editorially hidden products', () => {
    expect(filterAndSortProducts([{ ...base, showOnStorefront: false }], { query: '', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })

  it('ignores accents and understands common catalog synonyms', () => {
    const products = [
      { ...base, id: 'mage', storefrontTitle: 'Miniatura Mago Élfico 32mm', marketplaceTitle: 'Personagem arcano para D&D' },
    ]
    expect(filterAndSortProducts(products, { query: 'elfo', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['mage'])
    expect(filterAndSortProducts(products, { query: 'rpg', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['mage'])
  })

  it('finds the real RPG scenery products with accent and singular/plural variations', () => {
    const products = [
      { ...base, id: 'MLB7426771372', storefrontTitle: 'Templo em Ruínas RPG Cenário 3D Dungeon Fantasia', updatedAt: '2026-08-16T02:31:45.599Z' },
      { ...base, id: 'MLB7427034982', storefrontTitle: 'Kit 6 Ruínas RPG Cenário Modular Dungeon Fantasia 3D', updatedAt: '2026-08-16T02:31:44.850Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    for (const query of ['cenario', 'cenário', 'cenarios', 'cenários', 'ruina', 'ruína', 'ruinas', 'ruínas', 'dungeon']) {
      expect(search(query), query).toEqual(['MLB7426771372', 'MLB7427034982'])
    }
    expect(search('templo')).toEqual(['MLB7426771372'])
  })

  it('finds crystals, rocks and trees by singular, plural and accent, and treats pedra as rocha', () => {
    const products = [
      { ...base, id: 'MLB7451226704', storefrontTitle: 'Kit 10 Cristais Mágicos RPG Cenário 3D Dungeon Wargame', updatedAt: '2026-08-19T03:00:00.000Z' },
      { ...base, id: 'MLB7451208354', storefrontTitle: 'Kit 10 Rochas RPG Cenário 3D Terreno Modular Dungeon', updatedAt: '2026-08-19T02:00:00.000Z' },
      { ...base, id: 'MLB5071806599', storefrontTitle: 'Kit 10 Árvores RPG Cenário 3D Floresta Dungeon Wargame', updatedAt: '2026-08-19T01:00:00.000Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    for (const query of ['cristal', 'cristais', 'cristal magico', 'cristal mágico']) {
      expect(search(query), query).toEqual(['MLB7451226704'])
    }
    // "pedra" é como o comprador chama a peça que o anúncio nomeia "Rochas".
    for (const query of ['rocha', 'rochas', 'pedra', 'pedras']) {
      expect(search(query), query).toEqual(['MLB7451208354'])
    }
    for (const query of ['arvore', 'árvore', 'arvores', 'árvores']) {
      expect(search(query), query).toEqual(['MLB5071806599'])
    }
    for (const query of ['cenario', 'cenário', 'cenario rpg', 'cenário rpg']) {
      expect(search(query), query).toEqual(['MLB7451226704', 'MLB7451208354', 'MLB5071806599'])
    }
  })

  it('finds the portal and the adventurer goblins, including the intent that only lives in the description', () => {
    const products = [
      { ...base, id: 'MLB7462237046', storefrontTitle: 'Portal Em Ruínas RPG Cenário 3D Dungeon Fantasia Wargame', updatedAt: '2026-08-20T03:00:00.000Z' },
      { ...base, id: 'MLB5096680875', storefrontTitle: 'Kit 5 Goblins Aventureiros RPG 32mm Resina 8K Wargame', updatedAt: '2026-08-20T02:00:00.000Z' },
      { ...base, id: 'MLB7451226704', storefrontTitle: 'Kit 10 Cristais Mágicos RPG Cenário 3D Dungeon Wargame', updatedAt: '2026-08-20T01:00:00.000Z' },
      { ...base, id: 'MLB7451208354', storefrontTitle: 'Kit 10 Rochas RPG Cenário 3D Terreno Modular Dungeon', updatedAt: '2026-08-20T00:00:00.000Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    for (const query of ['portal', 'portais', 'portal rpg', 'portal em ruinas', 'portal em ruínas', 'portal antigo', 'portal magico', 'portal mágico', 'portal arcano']) {
      expect(search(query), query).toEqual(['MLB7462237046'])
    }
    for (const query of ['goblin aventureiro', 'goblins aventureiros', 'kit goblins', 'wargame goblins']) {
      expect(search(query), query).toEqual(['MLB5096680875'])
    }
    // "mana" e "terreno rochoso" só aparecem na descrição do anúncio; o alias aponta para a
    // palavra que está no título, em vez de indexar a descrição inteira.
    expect(search('mana')).toEqual(['MLB7451226704'])
    expect(search('terreno rochoso')).toEqual(['MLB7451208354'])
    expect(search('mina')).toEqual(['MLB7451226704', 'MLB7451208354'])
    // "caverna" serve o conjunto de cenário, porque "dungeon" está no título de todos eles.
    expect(search('caverna')).toEqual(['MLB7462237046', 'MLB7451226704', 'MLB7451208354'])
  })

  it('encontra os demônios por nome, e responde a hiperônimo sem virar busca genérica', () => {
    const products = [
      { ...base, id: 'DEMONIOS', storefrontTitle: 'Kit 12 Demônios RPG 32mm Resina 8K D&D Pathfinder', updatedAt: '2026-08-20T05:00:00.000Z' },
      { ...base, id: 'GOBLINS', storefrontTitle: 'Kit 5 Goblins RPG 32mm Resina 8K', updatedAt: '2026-08-20T04:00:00.000Z' },
      { ...base, id: 'DRAGAO', storefrontTitle: 'Miniatura Dragão RPG 75mm Resina', updatedAt: '2026-08-20T03:00:00.000Z' },
      { ...base, id: 'ROCHAS', storefrontTitle: 'Kit 10 Rochas RPG Cenário 3D Terreno Modular Dungeon', updatedAt: '2026-08-20T02:00:00.000Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    for (const query of ['demônio', 'demonio', 'demônios', 'demonios', 'kit demônios', 'kit demonios', 'miniatura demonio', 'miniaturas demônios', 'criatura infernal', 'criaturas infernais']) {
      expect(search(query), query).toEqual(['DEMONIOS'])
    }
    // Hiperônimo devolve a classe inteira de criaturas, e nada de cenário.
    for (const query of ['monstro rpg', 'monstros rpg', 'inimigos rpg']) {
      const ids = search(query)
      expect(ids, query).toEqual(expect.arrayContaining(['DEMONIOS', 'GOBLINS', 'DRAGAO']))
      expect(ids, query).not.toContain('ROCHAS')
    }
    // "boss" e "chefe" apontam para as peças grandes, não para todo inimigo.
    for (const query of ['boss rpg', 'chefe rpg']) {
      expect(search(query).sort(), query).toEqual(['DEMONIOS', 'DRAGAO'])
    }
  })

  it('acha o kit de 5 demônios por asa e pela identidade editorial, sem sujar a busca por guerreiro', () => {
    const products = [
      { ...base, id: 'KIT5', storefrontTitle: 'Kit 5 Demônios RPG 32mm em Resina — O Pacto Infernal', marketplaceTitle: 'Kit 5 Demônios Rpg 32mm Resina 8k D&d Pathfinder', updatedAt: '2026-08-21T02:00:00.000Z' },
      { ...base, id: 'KIT12', storefrontTitle: 'Kit 12 Demônios RPG 32mm Resina 8K D&D Pathfinder', updatedAt: '2026-08-21T01:00:00.000Z' },
      { ...base, id: 'DRAGAO', storefrontTitle: 'Miniatura Dragão RPG 75mm Resina', updatedAt: '2026-08-21T00:00:00.000Z' },
      { ...base, id: 'GUERREIROS', storefrontTitle: 'Kit 6 Guerreiros Humanos RPG 32mm Resina 8K', updatedAt: '2026-08-20T23:00:00.000Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    // "O Pacto Infernal" vive no título editorial, então a busca acha sem precisar de alias.
    for (const query of ['pacto infernal', 'pacto']) {
      expect(search(query), query).toEqual(['KIT5'])
    }
    // Asa é de demônio ou dragão neste catálogo.
    for (const query of ['demônio alado', 'demonio alado', 'demônios alados', 'demonios alados']) {
      expect(search(query).sort(), query).toEqual(['KIT12', 'KIT5'])
    }
    expect(search('alado').sort()).toEqual(['DRAGAO', 'KIT12', 'KIT5'])
    // A decisão que este teste protege: "guerreiro" continua devolvendo só guerreiro. Um alias
    // guerreiro->demonio faria `guerreiro infernal` funcionar ao custo de poluir esta consulta.
    expect(search('guerreiro')).toEqual(['GUERREIROS'])
    expect(search('guerreiro infernal')).toEqual([])
  })

  // O bug que este teste trava: um produto chamado "Criaturas Demoníacas" não seria encontrado
  // pela busca mais óbvia, "demônio". O adjetivo `demoniacas` não contém `demonio` como
  // substring nem fica a uma edição de distância, e os hiperônimos apontam justamente para
  // `demonio` — então o produto sairia invisível para demônio, monstro, inimigo, boss e chefe.
  it('trata o adjetivo demoníaco como o substantivo demônio, nas duas direções', () => {
    const products = [
      { ...base, id: 'CRIATURAS', storefrontTitle: 'Kit 5 Criaturas Demoníacas RPG 32mm em Resina', marketplaceTitle: 'Kit 5 Criaturas Demoníacas Rpg 32mm Resina D&d Pathfinder', updatedAt: '2026-08-24T03:00:00.000Z' },
      { ...base, id: 'DEMONIOS12', storefrontTitle: 'Kit 12 Demônios RPG 32mm Resina 8K D&D Pathfinder', updatedAt: '2026-08-24T02:00:00.000Z' },
      { ...base, id: 'ESQUELETO', storefrontTitle: 'Miniatura Esqueleto Guerreiro D&D 32mm Resina', updatedAt: '2026-08-24T01:00:00.000Z' },
      { ...base, id: 'ROCHAS', storefrontTitle: 'Kit 10 Rochas RPG Cenário 3D Terreno Modular Dungeon', updatedAt: '2026-08-24T00:00:00.000Z' },
    ]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    // Pelo adjetivo, e pelo substantivo, os dois produtos demoníacos respondem.
    for (const query of ['criatura demoníaca', 'criatura demoniaca', 'criaturas demoníacas', 'criaturas demoniacas', 'demônio', 'demonio', 'demônios', 'demonios', 'monstro infernal', 'monstros infernais']) {
      expect(search(query).sort(), query).toEqual(['CRIATURAS', 'DEMONIOS12'])
    }
    // Aberração aponta para demônio; horror responde com o que o catálogo tem de sombrio.
    expect(search('aberração rpg').sort()).toEqual(['CRIATURAS', 'DEMONIOS12'])
    expect(search('aberracao rpg').sort()).toEqual(['CRIATURAS', 'DEMONIOS12'])
    expect(search('horror rpg').sort()).toEqual(['CRIATURAS', 'DEMONIOS12', 'ESQUELETO'])
    // Cenário não é criatura: os hiperônimos não podem varrer o catálogo inteiro.
    for (const query of ['criatura rpg', 'monstro rpg', 'inimigo rpg', 'boss rpg', 'chefe rpg', 'horror rpg']) {
      expect(search(query), query).not.toContain('ROCHAS')
    }
  })

  // As consultas que o kit novo precisa atender, na forma exata em que o comprador digita.
  const CONSULTAS_DO_KIT = [
    'demônio', 'demonio', 'demônios', 'demonios',
    'criatura demoníaca', 'criatura demoniaca', 'criaturas demoníacas', 'criaturas demoniacas',
    'monstro infernal', 'monstros infernais', 'monstro rpg', 'monstros rpg',
    'criatura rpg', 'criaturas rpg',
    'aberração', 'aberracao', 'aberrações', 'aberracoes',
    'inimigo rpg', 'inimigos rpg', 'boss rpg', 'chefe rpg',
  ]

  // O trio da família Demônios com os títulos reais. `CRIATURAS` é deliberadamente o mais
  // antigo dos três: se ele aparecer em primeiro lugar em alguma consulta, foi relevância, e
  // não recência, que o colocou lá.
  const KIT12 = { id: 'KIT12', storefrontTitle: 'Kit 12 Demônios RPG 32mm Resina 8K D&D Pathfinder', updatedAt: '2026-08-24T03:00:00.000Z' }
  const PACTO = { id: 'PACTO', storefrontTitle: 'Kit 5 Demônios RPG 32mm em Resina — O Pacto Infernal', marketplaceTitle: 'Kit 5 Demônios Rpg 32mm Resina 8k D&d Pathfinder', updatedAt: '2026-08-24T02:00:00.000Z' }
  const CRIATURAS = { id: 'CRIATURAS', storefrontTitle: 'Kit 5 Criaturas Demoníacas RPG 32mm em Resina', marketplaceTitle: 'Kit 5 Criaturas Demoníacas Rpg 32mm Resina D&d Pathfinder', updatedAt: '2026-08-24T01:00:00.000Z' }
  const familiaDemonios = [KIT12, PACTO, CRIATURAS].map((product) => ({ ...base, ...product }))

  it('acha o Kit 5 Criaturas Demoníacas nas 22 consultas do briefing, dentro do catálogo real', () => {
    // Catálogo real inteiro mais o trio: o teste não prova só que o kit aparece, prova que
    // aparecer não custou trazer utilidade, action figure ou peça de cenário no mesmo bolo.
    const products = [...loadSeedCatalog(), ...familiaDemonios]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)
    const foraDoTema = [
      'MLB6939934594', 'MLB4760837171', 'MLB6939931596', 'MLB4811652139', 'MLB4811792635',
      'MLB7031818556', 'MLB7032238810', 'MLB7017002734', 'MLB7009935076', 'MLB4760554807',
      'MLB4760522517', 'MLB6940678098', 'MLB4801125741', // utilidades
      'MLB4866656325', 'MLB6834016768', 'MLB4693803261', 'MLB6802936258', 'MLB6803322962', // figures
      'MLB7426771372', 'MLB7427034982', 'MLB5071806599', 'MLB7451208354', 'MLB7451226704', 'MLB7462237046', // cenário
    ]

    for (const query of CONSULTAS_DO_KIT) {
      const ids = search(query)
      expect(ids, query).toContain('CRIATURAS')
      for (const alheio of foraDoTema) expect(ids, `${query} trouxe ${alheio}`).not.toContain(alheio)
    }
  })

  it('demônio devolve os produtos da família Demônios, e só eles', () => {
    const products = [...loadSeedCatalog(), ...familiaDemonios]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)
    // Os três sintéticos carregam o título editorial; os três do fixture, o título do
    // marketplace. A consulta tem de achar os seis, e nada além deles.
    const demonios = ['CRIATURAS', 'KIT12', 'MLB7487608286', 'MLB7488354880', 'MLB7492964436', 'PACTO']

    for (const query of ['demônio', 'demonio', 'demônios', 'demonios', 'kit demônios']) {
      expect(search(query).sort(), query).toEqual(demonios)
    }
  })

  it('prioriza o produto que se chama como a consulta, sem esconder os irmãos de família', () => {
    const search = (query: string) => filterAndSortProducts(familiaDemonios, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)

    // "criatura demoníaca" acha os três — todos são criaturas demoníacas —, mas quem se chama
    // assim vem primeiro, à frente de dois produtos mais recentes que ele.
    for (const query of ['criatura demoníaca', 'criatura demoniaca', 'criaturas demoníacas', 'criaturas demoniacas']) {
      expect(search(query)[0], query).toBe('CRIATURAS')
      expect(search(query).sort(), query).toEqual(['CRIATURAS', 'KIT12', 'PACTO'])
    }
    // "pacto infernal" continua sendo do kit anterior: "pacto" só existe no título dele.
    for (const query of ['pacto infernal', 'pacto', 'o pacto infernal']) {
      expect(search(query), query).toEqual(['PACTO'])
    }
    // Sem termo literal que separe os três, a ordem volta a ser a de recência.
    expect(search('demonio')).toEqual(['KIT12', 'PACTO', 'CRIATURAS'])
  })

  it('relevância só reordena: não muda o conjunto nem atropela ordenação explícita', () => {
    const products = familiaDemonios.map((product, index) => ({ ...product, price: 100 + index }))
    const search = (query: string, sort: CatalogSort) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort }).map((product) => product.id)

    // Mesmo conjunto em qualquer ordenação — relevância é critério de ordem, nunca de filtro.
    for (const sort of ['recentes', 'menor-preco', 'maior-preco', 'az'] as CatalogSort[]) {
      expect(search('criatura demoniaca', sort).sort(), sort).toEqual(['CRIATURAS', 'KIT12', 'PACTO'])
    }
    // Quem pediu menor preço recebe menor preço, e não o mais relevante primeiro.
    expect(search('criatura demoniaca', 'menor-preco')).toEqual(['KIT12', 'PACTO', 'CRIATURAS'])
    expect(search('criatura demoniaca', 'maior-preco')).toEqual(['CRIATURAS', 'PACTO', 'KIT12'])
    // Sem consulta, a vitrine continua por recência: não há relevância para medir.
    expect(search('', 'recentes')).toEqual(['KIT12', 'PACTO', 'CRIATURAS'])
  })

  it('as consultas do resto do catálogo não passam a devolver demônios', () => {
    const products = [...loadSeedCatalog(), ...familiaDemonios]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)
    const demonios = ['CRIATURAS', 'KIT12', 'PACTO']

    // Fora desta lista de propósito: `resina 8k` e `32mm`, que são consultas de material e de
    // escala. Elas devolvem todo o catálogo de miniatura por definição, demônio incluído, e
    // exigir o contrário seria pedir que a busca por material ignorasse produtos de resina.

    for (const query of ['goblin', 'orc', 'esqueleto', 'ghoul', 'vampiro', 'necromante', 'morto vivo', 'mago', 'guerreiro', 'dragão', 'fenrir', 'cristal', 'rocha', 'árvore', 'portal', 'templo', 'ruína', 'dungeon', 'cenário', 'suporte', 'organizador', 'pokemon', 'copo', 'maquiagem']) {
      const ids = search(query)
      expect(ids.length, query).toBeGreaterThan(0)
      for (const demonio of demonios) expect(ids, `${query} trouxe ${demonio}`).not.toContain(demonio)
    }
  })

  // O kit de criaturas bestiais entra no catálogo pelo mesmo mecanismo dos outros: canonização
  // de plural e hiperônimo. O que este teste protege é o limite — "besta", "criatura" e "monstro"
  // não podem passar a varrer cenário, utilidade ou action figure só porque ganharam mais um alvo.
  it('acha o kit de criaturas bestiais pelas consultas do briefing, sem varrer o resto do catálogo', () => {
    const BESTIAIS = {
      id: 'BESTIAIS',
      storefrontTitle: 'Kit 9 Criaturas Bestiais RPG 32mm em Resina',
      marketplaceTitle: 'Kit 9 Criaturas Bestiais Rpg 32mm Resina D&d Pathfinder',
      updatedAt: '2026-08-29T03:00:00.000Z',
    }
    const products = [...loadSeedCatalog(), { ...base, ...BESTIAIS }]
    const search = (query: string) => filterAndSortProducts(products, { query, category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)
    const foraDoTema = [
      'MLB6939934594', 'MLB4760837171', 'MLB6939931596', 'MLB4811652139', 'MLB4811792635',
      'MLB7031818556', 'MLB7032238810', 'MLB7017002734', 'MLB7009935076', 'MLB4760554807',
      'MLB4760522517', 'MLB6940678098', 'MLB4801125741', // utilidades
      'MLB4866656325', 'MLB6834016768', 'MLB4693803261', 'MLB6802936258', 'MLB6803322962', // figures
      'MLB7426771372', 'MLB7427034982', 'MLB5071806599', 'MLB7451208354', 'MLB7451226704', 'MLB7462237046', // cenário
    ]

    for (const query of [
      'criatura bestial', 'criaturas bestiais', 'bestial', 'bestiais', 'besta', 'bestas',
      'monstro rpg', 'monstros rpg', 'criatura rpg', 'criaturas rpg', 'inimigo rpg', 'inimigos rpg',
      'miniatura monstro', 'miniaturas monstros', 'miniatura criatura',
    ]) {
      const ids = search(query)
      expect(ids, query).toContain('BESTIAIS')
      for (const alheio of foraDoTema) expect(ids, `${query} trouxe ${alheio}`).not.toContain(alheio)
    }

    // Consulta de plataforma é ampla de propósito: `rpg`, `dnd` e `pathfinder` devolvem a
    // categoria inteira, cenário e action figure incluídos. Aqui só se cobra que o kit esteja lá.
    for (const query of ['rpg', 'dnd', 'd&d', 'pathfinder']) {
      expect(search(query), query).toContain('BESTIAIS')
    }

    // "criaturas bestiais" é o nome do produto: nenhum outro do catálogo real responde.
    expect(search('criaturas bestiais')).toEqual(['BESTIAIS'])
    expect(search('criatura bestial')).toEqual(['BESTIAIS'])

    // Consultas de outras criaturas continuam limpas: bestial não é sinônimo de nenhuma delas.
    for (const query of ['goblin', 'orc', 'esqueleto', 'vampiro', 'necromante', 'mago', 'dragão']) {
      expect(search(query), query).not.toContain('BESTIAIS')
      expect(search(query).length, query).toBeGreaterThan(0)
    }
  })

  it('busca por atributo do produto, ignorando o marketplace', () => {
    const products = [
      { ...base, id: 'resin', storefrontTitle: 'Miniatura sem material no título', attributes: { Material: 'Resina', Marketplace: 'Mercado Livre' } },
    ]
    expect(filterAndSortProducts(products, { query: 'resina', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['resin'])
    // "mercado" não pode casar toda peça só porque o atributo Marketplace existe.
    expect(filterAndSortProducts(products, { query: 'mercado', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })

  it('tolerates a small typo without matching unrelated terms', () => {
    const products = [
      { ...base, id: 'dragon', storefrontTitle: 'Dragão ancestral em resina' },
      { ...base, id: 'goblin', storefrontTitle: 'Goblin arqueiro' },
    ]
    expect(filterAndSortProducts(products, { query: 'drgao', category: 'todos', priceRange: 'all', sort: 'recentes' }).map((product) => product.id)).toEqual(['dragon'])
    expect(filterAndSortProducts(products, { query: 'carro', category: 'todos', priceRange: 'all', sort: 'recentes' })).toEqual([])
  })

  it('oferece saídas determinísticas quando a busca não encontra produto', () => {
    const products = [
      { ...base, id: 'goblin', category: 'miniaturas-rpg', featured: true },
      { ...base, id: 'figure', category: 'action-figures', featured: false },
      { ...base, id: 'hidden', category: 'utilidades', showOnStorefront: false },
    ]
    const result = zeroResultOptions(products, 'carro', 'todos')
    expect(result.categories).toEqual(['action-figures', 'miniaturas-rpg'])
    expect(result.products.map((item) => item.id)).toEqual(['goblin', 'figure'])
    expect(result.products.some((item) => item.id === 'hidden')).toBe(false)
  })
})
