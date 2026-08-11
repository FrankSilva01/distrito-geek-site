import { describe, expect, it } from 'vitest'
import { productFacts } from './product-facts'

const base = { title: 'Peça avulsa', attributes: {}, description: 'Uma peça.' }
const groupNamed = (heading: string, product: Parameters<typeof productFacts>[0]) =>
  productFacts(product).find((group) => group.heading === heading)

describe('product facts', () => {
  it('extrai especificações reais do título e dos atributos', () => {
    expect(groupNamed('Especificações', {
      ...base,
      title: 'Kit 5 Miniaturas Rpg 32mm Resina 8k D&d Pathfinder',
      attributes: { Material: 'Resina', Marketplace: 'Mercado Livre' },
    })).toEqual({ heading: 'Especificações', items: ['Material: Resina', 'Escala: 32 mm', '5 peças no kit'] })
  })

  it('declara compatibilidade apenas com os sistemas citados no anúncio', () => {
    expect(groupNamed('Compatibilidade', { ...base, title: 'Cavaleiro Esqueleto Rpg 32mm Resina D&d Pathfinder Wargame' }))
      .toEqual({ heading: 'Compatibilidade', items: ['D&D, Pathfinder, Wargame'] })
    expect(groupNamed('Compatibilidade', { ...base, title: 'Suporte De Toalha Travado Por Pressão' })).toBeUndefined()
  })

  it('reporta a condição de pintura só quando o título a declara', () => {
    expect(groupNamed('Especificações', { ...base, title: 'Miniatura Esqueleto D&d 32mm Resina 8k Sem Pintura' })?.items)
      .toContain('Enviada sem pintura')
    expect(groupNamed('Especificações', { ...base, title: 'Figure Mewtwo Pokémon 15cm Pintada Resina' })?.items)
      .toContain('Enviada pintada')
    expect(groupNamed('Especificações', base)).toBeUndefined()
  })

  it('não inventa grupo nem devolve campo vazio quando não há fato', () => {
    expect(productFacts(base)).toEqual([])
    expect(productFacts({ ...base, attributes: { Material: '   ', Marketplace: 'Shopee' } })).toEqual([])
  })

  it('lê seções estruturadas da descrição do anúncio', () => {
    expect(productFacts({
      ...base,
      description: 'Total: 5 peças.\n\nCOMPATIBILIDADE\n\nRPG de mesa\n\nO KIT CONTÉM\n\n- Guerreiro\n- Arqueiro\n\nINDICADO PARA\n\nMestres e colecionadores',
    })).toEqual([
      { heading: 'Compatibilidade', items: ['RPG de mesa'] },
      { heading: 'Indicado para', items: ['Mestres e colecionadores'] },
      { heading: 'Conteúdo da embalagem', items: ['Guerreiro', 'Arqueiro'] },
    ])
  })

  it('prefere o conteúdo editorial da vitrine e não repete o mesmo fato duas vezes', () => {
    expect(productFacts({
      ...base,
      title: 'Kit Miniaturas Rpg 32mm',
      storefrontDescription: 'ESPECIFICAÇÕES\n\nEscala: 32 mm\n\nEscala: 32 mm',
      description: 'ESPECIFICAÇÕES\n\nNão deveria aparecer',
    })).toEqual([{ heading: 'Especificações', items: ['Escala: 32 mm'] }])
  })
})
