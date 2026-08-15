# Buscas sem resultado no Admin — Design

## Objetivo

Responder, com dados reais e regras determinísticas, o que visitantes procuraram no Distrito Geek e que o catálogo atual ainda não atende, distinguindo lacuna comercial de falha de busca. A funcionalidade é privada, exclusiva do Admin e não altera catálogo, Radar, Home, ProductPage ou SEO.

## Fonte de dados

- O GA4 permanece a única fonte do histórico de buscas.
- O evento existente `search_product` e o parâmetro `search_term` fornecem os termos pesquisados.
- A consulta usa `eventCount`, usuários e `dateHourMinute` quando essas métricas/dimensões estiverem disponíveis.
- `zero_results` é evidência histórica auxiliar, nunca a definição do estado atual.
- “Última ocorrência” só é exibida quando vier de um valor real retornado pelo GA4. Ausência vira `—`, nunca uma data inferida pelo período.
- A consulta reutiliza `commercialDimensionFilter`, limitando o domínio a `distritogeek.com.br` e excluindo `/admin`, Tag Assistant e debug.
- Nenhuma persistência paralela será criada.

## Normalização determinística

Um helper puro normaliza cada termo com:

1. lowercase e trim;
2. remoção de acentos;
3. compactação de espaços;
4. normalização de `32 mm` para `32mm`;
5. aliases conservadores compartilhados com a busca pública;
6. singular/plural somente para pares seguros do domínio, como `orc/orcs`, `goblin/goblins`, `moeda/moedas`, `token/tokens` e `mini/miniatura/miniaturas`.

O agrupamento preserva as variações originais e soma somente contagens reais. Busca vazia, termo de um caractere, URL, ruído técnico, debug e Tag Assistant são descartados. Termos válidos com uma única ocorrência são mantidos.

## Cruzamento com o estado atual

O processamento recebe sinais agregados do GA4, o catálogo administrativo completo e as oportunidades já existentes no Radar.

Para cada intenção:

1. Executa a busca pública real sobre produtos públicos atuais.
2. Executa o mesmo matching sobre produtos não públicos atuais.
3. Verifica por correspondência conservadora se existe produto público semanticamente equivalente que a busca pública não encontrou.
4. Verifica oportunidade do Radar apenas por nome/termos normalizados com correspondência segura.
5. Consulta famílias e o índice leve de guias somente como contexto, sem carregar `guides.ts`.

Matching ambíguo ou insuficiente resulta em `INCONCLUSIVO`; nenhuma associação é forçada.

## Classificações

- `RESOLVIDO`: a busca pública atual retorna pelo menos um produto público.
- `BUSCA NÃO ENCONTROU`: existe produto público com correspondência segura, mas o mecanismo público atual retorna zero.
- `PRODUTO OCULTO`: não há resultado público, mas existe produto não público com correspondência segura.
- `OPORTUNIDADE NO RADAR`: não há produto correspondente e existe oportunidade segura no Radar.
- `SEM PRODUTO`: não há produto público, oculto ou oportunidade segura, e o termo é uma intenção comercial suficientemente clara.
- `INCONCLUSIVO`: termo válido, mas ambíguo ou sem evidência suficiente para associação/classificação comercial segura.

A precedência é exatamente a ordem acima. O histórico nunca é apagado; publicar um produto ou corrigir um alias muda automaticamente a classificação futura para `RESOLVIDO`.

## Contratos

### Sinal do GA4

```ts
type SearchSignal = {
  normalizedTerm: string
  variants: string[]
  searches: number
  users?: number
  sessions?: number
  lastOccurredAt?: string
  historicalZeroResults?: number
}
```

Valores indisponíveis permanecem ausentes. `unknown` nunca vira zero.

### Linha administrativa

```ts
type CatalogSearchOpportunity = SearchSignal & {
  status: 'sem-produto' | 'produto-oculto' | 'busca-nao-encontrou' | 'oportunidade-radar' | 'resolvido' | 'inconclusivo'
  publicProducts: Product[]
  hiddenProducts: Product[]
  radarOpportunity?: { id: string; name: string }
  family?: { id: string; name: string }
  guide?: { slug: string; title: string }
  action?: { kind: 'product' | 'catalog' | 'radar' | 'search'; href?: string; label: string }
}
```

## Integração com o Admin

- Nova seção de navegação: `Buscas sem resultado`.
- O Admin continua sendo um único aplicativo lazy; não será criado aplicativo paralelo.
- Ao abrir a seção, o cliente usa o relatório administrativo existente para os sinais do GA4 e consulta `/api/admin-opportunities` em modo somente leitura.
- O catálogo administrativo já carregado é reutilizado.
- A tabela apresenta: termo, variações, buscas, usuários quando disponíveis, última ocorrência, produtos, Radar, status e ação.
- Filtros: todas, sem produto, produto oculto, oportunidade no Radar e resolvidas. `BUSCA NÃO ENCONTROU` permanece visível em “todas” e recebe destaque prioritário.
- Ordenação padrão: quantidade real de buscas decrescente, depois termo normalizado.
- Linguagem: “Sinal de procura” e “Pode indicar lacuna de catálogo”; nunca “alta demanda” ou promessa de venda.

## Ações

- `Abrir produto`: abre o produto correspondente no drawer/tela administrativa já existente quando houver integração segura; caso o padrão atual não suporte deep link do drawer, abre o catálogo Admin com filtro determinístico.
- `Abrir catálogo filtrado`: abre o catálogo público apenas para um termo que já retorna produtos.
- `Abrir Radar`: abre a seção existente do Radar e identifica a oportunidade correspondente sem modificar seu estado.
- `Revisar busca`: sinaliza `BUSCA NÃO ENCONTROU` para correção futura do alias.

Nenhuma ação cria, publica ou altera produtos, guias ou oportunidades.

## Ações necessárias

O Dashboard recebe no máximo um resumo agregado: “N termos pesquisados não possuem produtos públicos”. O clique abre a nova seção filtrada. Ausência de volume ou indisponibilidade do GA4 não vira erro crítico nem gera contagem inventada.

## Estados de erro

- GA4 não configurado ou indisponível: a seção explica que os sinais não puderam ser consultados e não mostra zeros como dados.
- Relatório sem linhas: estado vazio real.
- Radar indisponível: o cruzamento fica sem informação de Radar e não reclassifica para `SEM PRODUTO` por causa da falha; usa `INCONCLUSIVO` quando o Radar seria necessário para uma conclusão segura.
- Datas inválidas do GA4 são ignoradas.

## Performance e segurança

- Nenhuma dependência nova.
- Helpers puros e pequenos.
- Nenhuma importação de `guides.ts`; somente `guides-index.ts` se necessário.
- Bundle público deve permanecer inalterado; mudanças ficam no Admin lazy e em Netlify Functions.
- Nenhum dado do Admin vai para sitemap ou páginas indexáveis.

## Testes

Cobertura obrigatória:

- normalização, acentos, espaços, `32 mm/32mm`, aliases e plural seguro;
- agrupamento, variações originais, última ocorrência real e deduplicação;
- descarte de vazio, caractere único, URLs e debug;
- produto público, produto oculto, Radar seguro, busca quebrada e resolução automática;
- matching ambíguo como `INCONCLUSIVO`;
- filtros comerciais do GA4 e ausência de duplicação por re-render;
- UI da seção, filtros, ordenação, estados vazio/erro e ações;
- resumo único em “Ações necessárias”;
- regressão completa de SEO, Home, ProductPage e Radar.

## Fora do escopo

Sem novos guias, produtos, publicação automática, alteração do Radar, score, IA, embeddings, API externa, scraping, checkout, mudanças em Home/ProductPage/SEO ou persistência paralela.
