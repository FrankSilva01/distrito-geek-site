# Distrito Geek — SEO, Analytics e inteligência de aquisição

Data: 2026-08-09

## Objetivo

Adicionar SEO técnico e editorial, Google Analytics 4 com consentimento e um painel administrativo baseado na Google Analytics Data API, preservando integralmente o catálogo, a sincronização existente do Mercado Livre, os permalinks, o admin, o build e o deploy Netlify.

O site continuará sendo uma vitrine que direciona a compra aos marketplaces. Cliques externos serão tratados como interesse, nunca como venda.

## Restrições

- Não reimplementar OAuth, tokens ou sincronização do Mercado Livre.
- Não duplicar preço, estoque, imagens, status ou permalink do catálogo sincronizado.
- Não enviar dados pessoais ao GA4.
- Não carregar GA4 sem configuração e consentimento explícito.
- Não expor credenciais da Google Analytics Data API no frontend.
- Não criar páginas finas, produtos fictícios ou metadata enganosa.
- Não declarar checkout próprio, avaliações, frete, devolução ou disponibilidade inventada em dados estruturados.
- Canonical sempre sob `https://distritogeek.com.br`.

## Arquitetura

### SEO compartilhado

Um registro central de páginas e funções puras produzirá título, description, canonical, robots, Open Graph, breadcrumbs e JSON-LD. A mesma política será reutilizada pelo cliente, pela camada de HTML inicial e pelo sitemap para evitar regras divergentes.

A aplicação React continuará como SPA. Uma camada Netlify inspecionará as rotas públicas e inserirá a metadata específica no HTML inicial, sem reescrever a aplicação ou alterar o fluxo do catálogo. A metadata também continuará sendo atualizada no cliente durante navegação interna.

### Analytics público

Um módulo isolado será responsável por consentimento, carregamento do Google Tag Manager e envio de eventos ao `dataLayer`. O GTM será o carregador único de tags; o site não carregará simultaneamente `gtag.js` direto, evitando dupla contagem. O módulo permanecerá inativo se `VITE_GTM_ID` estiver ausente ou se o visitante não tiver aceitado Analytics.

Dentro do container GTM, o proprietário configurará GA4 e Microsoft Clarity. O snippet direto do Clarity não será duplicado no código do site.

Falhas, bloqueadores de anúncio e indisponibilidade do GA4 nunca impedirão busca, filtros ou navegação para marketplaces.

### Analytics administrativo

Uma função Netlify autenticada consultará a Google Analytics Data API. A função receberá somente período e consultas pré-definidas, nunca credenciais vindas do navegador. O frontend administrativo receberá dados agregados.

Credenciais server-side:

- `GA4_PROPERTY_ID`
- `GA4_CLIENT_EMAIL`
- `GA4_PRIVATE_KEY`

Configuração pública:

- `VITE_GTM_ID`
- `VITE_GOOGLE_SITE_VERIFICATION`

Identificadores fornecidos para a configuração operacional:

- Google Tag Manager: `GTM-KLJMDZ25`
- GA4, configurado dentro do GTM: `G-MH9W3NFF5L`
- Microsoft Clarity, configurado dentro do GTM: `xziz3wcv43`

Sem essas variáveis, o site permanece funcional e o admin exibe um estado amigável de integração ainda não configurada.

## Modelo editorial do produto

Os overrides editoriais existentes serão ampliados, sem nova tabela e sem modificar o título original do marketplace:

- `storefrontTitle?: string`
- `storefrontDescription?: string`
- `seoTitle?: string`
- `seoDescription?: string`
- `seoTags?: string[]`
- `showOnStorefront: boolean`
- `featured: boolean`

Fallbacks:

- título exibido: `storefrontTitle`, depois título normalizado do marketplace;
- descrição exibida: `storefrontDescription`, depois descrição sincronizada;
- título SEO: `seoTitle`, depois título exibido com sufixo `| Distrito Geek`;
- description SEO: `seoDescription`, depois `storefrontDescription`, depois resumo contextual da descrição sincronizada.

`seoTags` será usado somente para organização e seleção editorial interna. Não será emitido como `meta keywords`.

## Consentimento e privacidade

O banner permitirá “Aceitar Analytics” e “Recusar”. A preferência será persistida localmente e poderá ser alterada na Política de Privacidade.

Antes do aceite:

- não carregar o container GTM, GA4 ou Clarity;
- não criar cookies analíticos;
- não enviar eventos.

Os eventos aceitarão somente campos previstos em tipos e sanitizadores. Nome, e-mail, telefone, tokens e valores de formulários de contato não poderão ser enviados.

## Eventos GA4

### Eventos

- `view_product`: uma vez por visualização de rota de produto.
- `view_category`: ao abrir catálogo, categoria ou landing editorial.
- `search_product`: após debounce, com termo normalizado e número de resultados.
- `filter_catalog`: ao mudar categoria, faixa de preço ou ordenação.
- `click_mercado_livre`: antes da navegação ao Mercado Livre.
- `click_shopee`: antes da navegação à Shopee.

### Parâmetros permitidos

- `product_id`
- `external_id`
- `product_name`
- `category`
- `price`
- `marketplace`
- `marketplace_url`
- `search_term`
- `filter_type`
- `filter_value`
- `result_count`

O clique externo chamará Analytics sem aguardar confirmação de rede. A navegação será executada normalmente mesmo se o envio lançar erro.

## Landings SEO

O registro editorial conterá:

- `/miniaturas-rpg`
- `/miniaturas-dnd`
- `/miniaturas-pathfinder`
- `/miniaturas-rpg-32mm`
- `/miniaturas-resina`
- `/kits-rpg`
- `/action-figures`

Cada landing terá H1 único, introdução, seções H2 úteis, produtos reais relacionados, FAQ contextual quando houver conteúdo, breadcrumbs, links internos, metadata, canonical e Open Graph específicos.

A seleção de produtos utilizará categoria, título, descrição e atributos reais. Uma landing com produtos e conteúdo suficiente será `index, follow` e entrará no sitemap. Uma landing sem produtos permanecerá acessível, mas receberá `noindex, follow` e ficará fora do sitemap.

Não será criado um blog completo. A arquitetura de registro permitirá adicionar futuramente guias sob `/guias/*`, mas esta entrega não gerará páginas finas automaticamente.

## Indexação e canonical

- Produto publicado, visível, válido e com conteúdo útil: indexável.
- Produto pausado: acessível sem link inválido; indexabilidade dependerá da utilidade preservada da página.
- Produto arquivado ou inexistente: 404; redirects serão adicionados somente quando existir equivalente real.
- Filtros e ordenações via query string: `noindex, follow` e canonical para a rota limpa.
- Landings editoriais relevantes terão URLs estáveis, sem depender de filtros.
- URLs Netlify nunca serão emitidas como canonical.

## Links internos e breadcrumbs

- Home aponta para landings prioritárias.
- Produto aponta para sua landing/categoria editorial e produtos relacionados.
- Landing aponta para produtos e landings semanticamente próximas.
- Breadcrumb visual e `BreadcrumbList` usarão a mesma fonte de dados.

Produto: `Início → Categoria editorial → Produto`.

Categoria: `Início → Categoria`.

## Structured data e Open Graph

Páginas públicas reutilizarão:

- `Organization`
- `WebSite`
- `BreadcrumbList`
- `Product` somente em produto válido

O `Product` poderá apontar a oferta para o permalink real e ativo do marketplace, sem indicar checkout no domínio. Não serão inventados rating, reviewCount, frete, política de devolução ou condições ausentes.

Produto e categoria terão `og:title`, `og:description`, `og:image`, `og:url` e `og:type` coerentes. Produto usará sua própria imagem prioritária.

## Imagens

- Imagens terão `alt` contextual, dimensões ou proporção reservada e lazy loading fora do conteúdo prioritário.
- A imagem principal de produto e o hero terão prioridade adequada.
- URLs externas sincronizadas não serão regravadas.
- Novos arquivos próprios usarão nomes semânticos.

## Sitemap, robots e Search Console

O sitemap dinâmico incluirá Home, catálogo, landings indexáveis, produtos públicos válidos, FAQ, contato e páginas legais definidas pela estratégia. Produtos usarão `updatedAt` em `lastmod` quando disponível.

O sitemap excluirá admin, funções privadas, mocks, ocultos, inválidos e landings sem produtos. `robots.txt` permitirá conteúdo público, bloqueará áreas administrativas/privadas e apontará para `https://distritogeek.com.br/sitemap.xml`.

A propriedade de domínio do Google Search Console será validada prioritariamente por DNS. O registro público fornecido é:

`google-site-verification=pRJtn_xkidOEDvUaE9KRcptB0wVfMNokn23LRPi-xto`

Esse valor será adicionado como registro TXT na zona DNS de `distritogeek.com.br` na Hostinger. A alteração não poderá remover ou substituir registros MX, SPF, DKIM, DMARC ou outros TXT existentes. Como a verificação escolhida é de domínio, o token não será inserido desnecessariamente no HTML. `VITE_GOOGLE_SITE_VERIFICATION` continuará suportado como método alternativo de meta verificação para propriedades de prefixo de URL.

## Admin de SEO

A curadoria por produto será organizada em seções expansíveis:

- Apresentação: título e descrição da vitrine.
- SEO: título, description e tags internas.
- Visibilidade: vitrine e destaque.
- Preview Google aproximado com URL, título e descrição.
- Contadores de caracteres orientativos, sem bloqueio rígido.

Salvar metadata editorial continuará sem alterar preço, estoque, status, imagens, título ou permalink sincronizados.

## Painel SEO & Analytics

O painel autenticado terá período de 7, 28 ou 90 dias e mostrará, quando configurado:

- visitas;
- visualizações de produto;
- cliques Mercado Livre;
- cliques Shopee;
- taxa de clique externo = cliques externos / visualizações de produto;
- produtos por visualizações, cliques e CTR;
- buscas internas mais usadas;
- buscas sem resultado.

Não haverá armazenamento paralelo em Netlify Blobs nesta fase. A GA4 Data API será a fonte dos agregados. O painel não chamará clique de venda.

## Tratamento de erros

- Falha de Analytics público: silenciosa para o visitante e sem impedir ações.
- Consentimento recusado: nenhum script ou evento analítico.
- GA4 não configurado no admin: estado instrutivo, não erro técnico.
- Credenciais inválidas ou API indisponível: mensagem amigável e resposta sem segredos.
- Catálogo indisponível: manter o comportamento atual, sem substituir por mocks.
- Metadata incompleta: usar fallbacks determinísticos e testados.

## Desempenho

Baseline de produção:

- Performance: 98
- Accessibility: 95
- Best Practices: 96
- SEO: 100
- CLS: 0
- LCP: 2,3 s

GTM, GA4 e Clarity serão carregados somente após consentimento e fora do caminho crítico. A biblioteca da Data API ficará restrita às funções/backend. Não será aceita regressão relevante; qualquer redução será documentada e investigada antes do deploy.

## Testes e validação

Testes cobrirão:

- carregamento condicional e consentimento;
- schemas e parâmetros de eventos;
- clique funcionando quando Analytics falha;
- fallbacks de título e description;
- canonical e `noindex` de filtros;
- Open Graph, JSON-LD e breadcrumbs;
- links internos;
- sitemap, `lastmod`, robots e exclusão de ocultos;
- edição e preview SEO no admin;
- autenticação, configuração ausente e respostas agregadas da Data API.

Antes do deploy serão executados testes completos, typecheck, build, inspeção do HTML inicial e do DOM, navegação desktop/mobile e validação de produtos/permalinks reais. Após o deploy serão verificados domínio, sitemap, robots, páginas prioritárias, eventos em modo de depuração quando configurados e Lighthouse comparado ao baseline.

## Documentação operacional

A entrega documentará:

1. configuração de `VITE_GTM_ID=GTM-KLJMDZ25` na Netlify;
2. publicação da tag GA4 `G-MH9W3NFF5L` dentro do GTM, sem instalar `gtag.js` em paralelo;
3. publicação do Clarity `xziz3wcv43` dentro do GTM;
4. configuração das regras de consentimento das tags;
5. habilitação da Google Analytics Data API;
6. criação da service account e concessão de leitura na propriedade;
7. configuração segura de `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL` e `GA4_PRIVATE_KEY`;
8. inclusão do TXT de verificação de domínio no DNS da Hostinger, preservando registros de e-mail;
9. verificação do Search Console e envio do sitemap;
10. métricas e dimensões personalizadas necessárias para relatórios;
11. rotina semanal para impressões, cliques, CTR, posição, páginas, buscas e cliques externos.

Não será afirmado que GA4, Data API ou Search Console estão coletando dados antes da configuração manual e da verificação efetiva.

## Critérios de aceite

- Catálogo e integração Mercado Livre preservados.
- GTM, GA4 e Clarity não carregam sem ID e consentimento.
- Eventos não contêm dados pessoais e nunca quebram navegação.
- Metadata inicial e dinâmica é específica e canônica.
- Landings usam produtos reais e regras de indexação seguras.
- Sitemap e robots refletem as mesmas regras do catálogo público.
- Campos SEO são persistidos como overrides editoriais.
- Painel funciona com Data API configurada e degrada de forma amigável sem ela.
- Testes, typecheck e build passam.
- Lighthouse não apresenta regressão relevante.
- Deploy é validado no domínio oficial.
