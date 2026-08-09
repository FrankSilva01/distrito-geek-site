# Distrito Geek — curadoria e refinamento da vitrine

**Data:** 9 de agosto de 2026  
**Status:** aprovado em conversa, aguardando revisão do documento  
**Escopo:** refinamento incremental do storefront existente

## Objetivo

Elevar a qualidade visual e editorial da Distrito Geek, preservando integralmente a sincronização existente com o FlowOps e o Mercado Livre. O catálogo continuará usando anúncios reais previamente sincronizados; nenhuma página fará consulta direta ao Mercado Livre.

A direção visual permanece dark premium, com carvão, preto e dourado, referências discretas a RPG e fantasia, sem neon, cyberpunk, infantilização ou aparência de template genérico.

## Fora do escopo

- Reimplementar OAuth, tokens, refresh token ou sincronização.
- Criar checkout, carrinho, pagamento, login de cliente, avaliações, pontos ou blog.
- Implementar API da Shopee.
- Alterar domínio, DNS, e-mail ou configuração funcional da Netlify.
- Excluir anúncios automaticamente ou modificar o título original no marketplace.
- Fazer um redesign completo ou adicionar bibliotecas pesadas para efeitos.

## Arquitetura preservada

O fluxo continua:

`FlowOps/Mercado Livre → endpoint sincronizado existente → adaptador Distrito Geek → catálogo público`

O adaptador da Distrito Geek continuará convertendo o contrato externo no modelo `Product`. Preço, imagens, estoque, status, permalink e data de sincronização permanecem controlados pela fonte existente. A camada editorial interna conterá apenas preferências da vitrine.

## Modelo editorial

O produto terá os seguintes conceitos:

- `marketplaceTitle`: título original recebido da integração.
- `storefrontTitle`: título editorial opcional para exibição.
- `showOnStorefront`: define a presença no catálogo público.
- `featured`: define preferência nos destaques da Home.

Se o contrato externo já fornecer campos equivalentes, eles serão reutilizados. Caso contrário, as preferências serão armazenadas como sobreposições editoriais internas, sem modificar o schema ou o serviço externo.

Para não retirar anúncios existentes inesperadamente, produtos publicados e ativos terão `showOnStorefront = true` por padrão. A ausência de `storefrontTitle` acionará somente uma normalização visual, sem alterar o dado original.

O painel administrativo permitirá editar `storefrontTitle`, `showOnStorefront` e `featured`. Uma nova sincronização poderá atualizar dados comerciais sem apagar essas preferências editoriais.

## Regras de visibilidade e curadoria

O catálogo público exibirá produtos com status publicado, anúncio ativo e `showOnStorefront = true`.

A Home exibirá no máximo oito destaques. A seleção seguirá esta ordem:

1. Produtos visíveis marcados como `featured`.
2. Produtos visíveis e ativos que completem as vagas.
3. Diversidade de categoria e família visual antes da ordem cronológica.

Produtos com títulos e imagens muito semelhantes serão agrupados apenas durante a seleção da Home. No máximo um representante de cada grupo aparecerá nos destaques. Nenhum anúncio será removido do catálogo por essa regra.

Produtos de “Utilidades Geek” continuarão disponíveis no catálogo, mas não entrarão nos destaques nem nas categorias promovidas da Home nesta rodada.

## Categorias editoriais da Home

A Home priorizará:

- Miniaturas RPG.
- Action Figures.
- Kits e Exércitos.

“Kits e Exércitos” será uma agrupação editorial derivada dos títulos e categorias existentes. Ela não exige uma nova tabela ou alteração no sistema externo.

Cada card de categoria terá nome, descrição, CTA interno e imagem configurada. Quando a imagem configurada não estiver disponível, será usado um produto real representativo da própria categoria. Nunca será utilizada imagem de outra linha de produto.

## Normalização de títulos

A normalização afeta somente a exibição. Ela corrigirá capitalização conhecida, como `Rpg → RPG`, `8k → 8K` e `D&d → D&D`, removerá repetições óbvias e poderá encurtar complementos sem mudar o significado do anúncio.

O valor explícito de `storefrontTitle` sempre terá prioridade. O título original continuará disponível no modelo para auditoria e SEO quando necessário.

## Home

- Reduzir em aproximadamente 20% os espaços excessivos entre benefícios, destaques e seção de marketplaces.
- Atualizar benefícios para textos verificáveis: resina 8K, produção conforme disponibilidade, envio e compra pelo marketplace.
- Tornar a seção de marketplaces mais leve, com o título “Escolha onde finalizar sua compra”.
- Mercado Livre terá identidade amarela equilibrada.
- Shopee terá identidade laranja somente quando houver link válido. Sem URL, não haverá CTA clicável.
- Exibir no máximo oito destaques variados.
- Exibir apenas as três categorias editoriais aprovadas.

## ProductCard

Cada card apresentará:

1. Imagem em container uniforme.
2. Tag discreta do marketplace ou categoria.
3. Título editorial.
4. Preço real sincronizado.
5. Estado de disponibilidade.
6. Um único CTA “Ver produto”.

As imagens usarão proporção uniforme, `object-fit: contain`, fundo neutro e padding consistente para não cortar miniaturas. Hover, borda e zoom serão discretos e respeitarão `prefers-reduced-motion`.

## Catálogo e filtros

A página continuará oferecendo busca, categorias, contador e ordenação. Serão garantidas as ordens:

- Mais recentes.
- Menor preço.
- Maior preço.
- Nome A–Z.

O filtro de preço deixará de usar o teto fixo de R$ 5.000. As faixas serão derivadas do mínimo e máximo dos produtos públicos ativos, usando limites úteis próximos de R$ 50, R$ 100, R$ 200 e R$ 400 quando fizer sentido para os dados atuais.

No mobile, filtros e ordenação permanecerão acessíveis por teclado e não causarão overflow horizontal.

## Página de produto

No desktop, a página manterá galeria e informações em duas colunas. No mobile, a ordem será galeria, dados principais, opções de compra e descrição.

Serão exibidos somente dados disponíveis: breadcrumb, categoria, título editorial, preço, disponibilidade, descrição, material, escala, dimensões e demais atributos reais.

A seção “Escolha onde comprar” listará apenas anúncios ativos e URLs válidas. O botão do Mercado Livre utilizará exclusivamente o permalink sincronizado. Shopee só aparecerá quando o produto possuir anúncio real válido.

Os estados de disponibilidade serão:

- Disponível, quando os dados indicarem quantidade disponível.
- Produção sob demanda, somente quando essa condição estiver presente nos atributos ou descrição recebida.
- Indisponível, quando o anúncio estiver pausado, encerrado ou sem compra ativa.

## Header, benefícios e navegação

O header sticky manterá sua função atual. Serão revisados altura, `top`, `z-index`, `scroll-margin-top` e espaçamento das seções para impedir conteúdo oculto ao navegar por links ou âncoras.

Os benefícios não farão promessas absolutas nem alegarão envio rápido sem SLA confirmado.

## Footer

O footer terá:

- Marca Distrito Geek.
- Links internos para Miniaturas RPG, Action Figures, Kits e Colecionáveis.
- FAQ, contato, política de privacidade e termos.
- Mercado Livre e Shopee apenas quando houver destino real válido.
- `contato@distritogeek.com.br`.
- Redes sociais somente quando URLs reais estiverem configuradas.

Nenhum link fictício ou `href="#"` será introduzido.

## SEO, acessibilidade e performance

O canonical continuará usando `https://distritogeek.com.br`. Metadata específica será preservada ou refinada para Home, catálogo, categoria, produto, FAQ e contato.

Todos os controles terão labels, foco visível, semântica de headings, texto alternativo adequado e navegação por teclado. Contraste será validado nos temas claro e escuro.

As imagens permanecerão dimensionadas, com lazy loading abaixo da dobra. Não haverá busca direta ao Mercado Livre por card, requisições duplicadas ou nova biblioteca pesada de animação.

## Tratamento de erros

- Na indisponibilidade temporária da fonte, usar o último catálogo sincronizado válido.
- Se não houver catálogo válido, mostrar a mensagem amigável já definida, sem produtos fictícios.
- Preferências editoriais inválidas terão fallback seguro para título original, visibilidade padrão e ausência de destaque.
- Link de marketplace inválido não será renderizado como CTA.

## Testes e critérios de aceite

Antes de publicar:

- Executar `lint` se houver script configurado.
- Executar typecheck, testes e build reais.
- Revalidar a integração pública e permalinks do Mercado Livre.
- Confirmar que “Utilidades Geek” permanece no catálogo e não aparece na Home.
- Confirmar que a Home tem no máximo oito destaques sem famílias duplicadas dominantes.
- Confirmar ausência de produtos fictícios e CTAs quebrados.
- Testar Home, catálogo, categoria e produto em 320, 375, 390, 430, 768, 1024, 1366, 1440 e 1920 px.
- Validar temas claro e escuro, teclado, overflow, imagens e header sticky.
- Executar Lighthouse após o deploy ou em build equivalente.

## Arquivos previstos

As alterações devem se concentrar em:

- `src/domain/product.ts` e testes do domínio.
- `src/integrations/storefront.ts` e testes do adaptador.
- `netlify/functions/_shared/catalog-store.ts` e funções administrativas relacionadas.
- `src/admin/AdminPage.tsx`.
- `src/components/ProductCard.tsx`, `SiteHeader.tsx` e `SiteFooter.tsx`.
- `src/pages/HomePage.tsx`, `CatalogPage.tsx` e `ProductPage.tsx`.
- `src/components/Seo.tsx`.
- `src/styles/global.css`.

OAuth, tokens, refresh token e o serviço de sincronização do FlowOps não fazem parte dos arquivos previstos.

