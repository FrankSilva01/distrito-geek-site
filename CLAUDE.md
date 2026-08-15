# Contexto para continuidade — Distrito Geek

> ## Rodada Analytics/Home — 15/08/2026
>
> - Baseline antes da mudança: typecheck + 294 testes + build + `git diff --check` verdes; bundle público 447,43 kB / 133,45 kB gzip.
> - Eventos `guide_*`: a origem atual já enviava `guide_slug`, `guide_title` e `guide_cluster`; o `(not set)` vinha de eventos antigos/incompletos aceitos sem validação e da consulta sem filtro. Agora eventos editoriais incompletos são recusados no cliente e linhas vazias/`(not set)` são excluídas do funil.
> - KPIs comerciais GA4 agora usam somente `hostName=distritogeek.com.br`, excluem `/admin` e origem/mídia do Tag Assistant. O Admin continua sem carregar GTM. O filtro de IP/tráfego interno permanece configuração externa do GA4.
> - Cliques ML/Shopee: o CTA repetido no corpo da descrição não enviava `product_id`, `external_id` e `price`; corrigido para o mesmo contrato do CTA principal.
> - Clarity: API Data Export consultada com a configuração de produção e respondeu **HTTP 403**. Não tratar zeros como ativo: saúde diferencia ativo com sessões, aguardando dados, token recusado e indisponível. Pendência externa: gerar novo token Data Export no projeto `xziz3wcv43` e substituir `CLARITY_API_TOKEN` na Netlify.
> - Home: “Comprar por tipo” foi antecipado, usa apenas categorias com produtos reais, mostra contagem real e não usa fallback de imagem de outra categoria; destaques priorizam miniaturas RPG/kits antes de action figures; apoio editorial caiu de seis para três guias, sem criar conteúdo.
> - `necromante-rpg`: revisão cirúrgica concluída sem alteração textual — title, description, H1, intenção, links e produto relacionado já estão coerentes; sem evidência do Search Console que justifique reescrita.
> - Curadoria manual: `Porta Pincéis de Maquiagem...` permanece público, mas é excluído da Home por `utilidades-geek`; não foi ocultado automaticamente. Action figures/Pokémon/Street Fighter permanecem decisões manuais válidas de colecionáveis.
> - Anúncios `MLB-5049864601` e `MLB-7400799166`: ausentes tanto do `/api/catalog` (23 públicos no momento da inspeção) quanto do endpoint upstream FlowOps (42 registros). A vitrine não os bloqueia; é necessário sincronizar/importar esses anúncios na conta/empresa correta do FlowOps. Não criar cópia manual no Distrito Geek.
> - Depois da mudança: 298 testes verdes; build verde; bundle público 447,70 kB / 133,55 kB gzip (+0,10 kB gzip). CSS 42,22/8,70 kB; GuidePage 156,69/48,22 kB; Admin 396,62/129,40 kB.

> ## 🧊 ESTADO CONGELADO PARA COLETA DE DADOS (handoff — leia primeiro)
>
> **Para outro Claude / outra máquina:** o SEO técnico e o conteúdo editorial foram concluídos e congelados. **NÃO** executar novas auditorias técnicas gerais nem criar guias/conteúdo novo sem nova evidência.
>
> **Estado atual (branch `feat/distrito-geek-storefront`, já publicado):**
> - 294 testes passando · **25 produtos públicos em produção** (verificado em `/api/catalog` em 11/08; o número muda conforme a visibilidade no Admin — confira na API, não neste texto) · 32 guias (7 clusters) · 0 órfãos · 0 links internos quebrados
> - **Mercado Livre conectado ao Radar (rodada 13):** aba Evidências → "Buscar no Mercado Livre" → endpoint admin `admin-research-mercadolivre` (admin-only, no-store, **não persiste**) chama `/sites/MLB/search` server-side (token só no servidor: `ML_ACCESS_TOKEN` estático OU `ML_CLIENT_ID`+`ML_CLIENT_SECRET`+`ML_REFRESH_TOKEN` com refresh OAuth rotacionado nos Blobs `ml-oauth`). Mapeamento puro em `src/research/mercadolivre-mapping.ts`: **`sold` referencial com `note` (ausente→`unknown`, nunca 0)**, reviews/qtd/escala/material só de atributo estruturado, comparabilidade entra `parcial` (revisão humana promove; motor só conta `comparavel`). UI de revisão (seleção/edição) importa em **nova ResearchSession** → motor recalcula. **Feature flag:** sem credenciais o Radar segue manual. **Motor NÃO alterado.** Docs: `docs/provider-mercado-livre.md`. **Shopee/TikTok/Google/scraping continuam fora.**
> - **Coleta automática — investigação (rodada 12):** viáveis por API oficial = Mercado Livre (feito) e Shopee Afiliados (`productOfferV2`, exige afiliado aprovado; **não conectado**); TikTok/Google/lojas seguem manuais. Andaime `src/research/market-research.ts` (contrato `MarketResearchProvider→Evidence[]`, `normalizeEvidence`/`toUnknownNumber`). Relatório: `docs/pesquisa-coleta-automatica.md`.
> - sitemap / canonical / schema / robots consistentes (cliente↔edge↔sitemap); produto→guia (ranking semântico) e guia→produto validados
> - bundle inicial ~133 kB gzip · GuidePage lazy ~48 kB · AdminPage lazy · RadarManager lazy (~10 kB gzip, chunk próprio) · code-splitting preservado
> - Validação obrigatória antes de qualquer push: `npm run typecheck`, `npm test -- --run`, `npm run build`, `git diff --check` (não há lint). Deploy é automático no push (Netlify) — combinar com o Franklin antes.
>
> **Radar de Oportunidades (rodada 11):** módulo para avaliar ideias de produto ANTES de cadastrar — sem IA, sem score mágico. Motor puro e auditável em `src/domain/opportunity.ts` (métricas de preço com preço/unidade sem misturar avulso e kit; demanda/concorrência/preço/aderência/confiança; heatmap QUENTE/MORNO/FRIO/INCONCLUSIVO limitado pela confiança; todo resultado vem com o "por quê"). **Regra crítica: ausência de dado é `'unknown'`, NUNCA 0.** Persistência privada em Blobs (`radar-opportunities`) via endpoint admin-only `admin-opportunities` (fora do catálogo público e do sitemap; robots já bloqueia `/api/admin-`). UI em `src/admin/RadarManager.tsx` (lazy): lista+filtros, drawer com abas Resumo/Mercado/Evidências/Preço/Conteúdo/Histórico, sessões de pesquisa preservadas, "conteúdo sem produto" (guias sem produto) com criar-oportunidade. Helpers puros em `radar-helpers.ts`. **Coleta externa (ML/Shopee/TikTok/Google/scraping/IA) NÃO implementada de propósito — V1 é 100% manual; APIs futuras só automatizam a coleta, a decisão continua sendo o motor determinístico.**
>
> **Admin de Catálogo (rodada 10):** `src/admin/CatalogManager.tsx` (tabela compacta + filtros + busca + drawer com abas Produto/Visibilidade/Conteúdo/SEO/Canais/Saúde + ações em lote + simulador de preço) substituiu os cards de curadoria. Lógica pura em `catalog-manager.ts`. Usa só o índice leve de guias — **AdminPage segue lazy, não importa `guides.ts`**. Edição via override editorial (PATCH reconstrói o override completo p/ não perder campos).
>
> **Modelo de catálogo (rodada 9 — consolidação):** visibilidade em TRÊS conceitos independentes — `isPublicProduct` (PUBLICADO: público em tudo) ⊃ `showsOnHome` (MOSTRAR NA HOME: `showOnHome !== false`, só afeta a Home) + `featured` (DESTAQUE). Admin tem três checkboxes distintos. **SKU DG** próprio e permanente (`DG-<PREFIXO>-<6díg>`, `domain/sku.ts`) via registro por id interno — gerado uma vez, nunca regenerado; Product JSON-LD usa `sku||id`. `listings` é multicanal (ML/Shopee/TikTok/other). Ver `visibility.test.ts`, `sku.test.ts`, `encoding.test.ts` (anti-mojibake).
>
> **Só voltar a mexer em SEO/conteúdo mediante um destes gatilhos (com dados/evidência em mãos):**
> 1. Search Console (queries, impressões, posição, CTR, cobertura)
> 2. GA4 (comportamento, funil, conversão para marketplace)
> 3. Busca interna (termos, `zero_results` já instrumentado)
> 4. Comportamento de usuários (Clarity)
> 5. Novos produtos no catálogo
> 6. Bug/regressão reproduzível com evidência objetiva
>
> **Medição — CONCLUÍDA em 11/08/2026 (não refazer, não investigar como se estivesse pendente):**
> - Search Console **conectado**. Service account em uso: `distrito-geek-analytics-reader@projeto-geral-783a0.iam.gserviceaccount.com`, projeto Cloud `projeto-geral-783a0`, com Analytics Data API e Search Console API habilitadas, Leitor no GA4 e Total no Search Console. A causa raiz da falha anterior era a **Search Console API desabilitada** num projeto Cloud que não aparecia na conta padrão do Franklin.
> - GTM **publicado** com 8 tags: `view_item`, `view_item_list`, `select_item` (com e-commerce/Data Layer) e `guide_view`, `guide_product_click`, `guide_related_click`, `guide_category_click` (**sem** e-commerce, com parâmetros planos). Validadas uma a uma no Tag Assistant, sem duplicação.
> - GA4 com 4 **dimensões personalizadas** de escopo de evento: `guide_slug`, `guide_cluster`, `destination_slug`, `product_id`.
> - Filtro de **tráfego interno** ativo por IP (IP dinâmico — frágil; o código agora também não carrega GTM em `/admin`).
> - Zeros no painel de Search Console significam `empty`, **não** erro. Diagnóstico rodado: `sites.list` HTTP 200 com `siteFullUser`, `searchAnalytics.query` HTTP 200 com 0 linhas. Site recente; Search Console leva dias para consolidar. **Não** tratar isso como bug.
>
> **Logo oficial aplicado (transparente):** o PNG enviado tinha canal alfa; assets otimizados gerados em `public/assets/logo-distrito-geek.webp` (completo) e `logo-emblema.webp` (emblema), + favicons PNG do emblema. Header = emblema + wordmark (lockup `.brand-lockup`); rodapé e login admin = logo completo. Regenerar a partir do original com `sharp` (extract do emblema `left:298,top:6,width:660,height:662`; trim para o completo) se precisar.
>
> **Pendências EXTERNAS que continuam abertas:** integrações de API do **Shopee** e **TikTok Shop** (o modelo de dados já aceita esses canais; falta a sincronização). Todo o código que depende disso já está pronto e degrada para estado vazio.
>
> O histórico detalhado das rodadas 1–8 e as invariantes de arquitetura estão nas seções abaixo.

## Objetivo do projeto

A Distrito Geek é uma vitrine independente de miniaturas RPG, action figures e colecionáveis. O site ajuda o visitante a descobrir e comparar produtos reais e direciona a compra para o anúncio oficial do Mercado Livre ou da Shopee. Não existe checkout próprio e este projeto não compartilha autenticação, banco ou domínio com o FlowOps.

- Produção: https://distritogeek.com.br
- Hospedagem: Netlify, projeto `distrito-geek-catalog`
- Repositório: https://github.com/FrankSilva01/distrito-geek-site
- Branch padrão atual: `feat/distrito-geek-storefront`
- Domínio e e-mail: DNS/serviços de e-mail permanecem na Hostinger. Não remover MX, SPF, DKIM, DMARC ou TXT relacionados a e-mail.

## Stack e arquitetura

- React 19, TypeScript 5.9, Vite 7 e React Router 7.
- Vitest e Testing Library.
- Netlify Functions para catálogo, administração, sitemap e relatórios analíticos.
- Netlify Blobs como armazenamento do catálogo administrável.
- Netlify Edge Function em `netlify/edge-functions/seo.ts` para metadata autoritativa, canonical, JSON-LD e 404 HTTP real.
- Catálogo inicial normalizado em `src/data/catalog.seed.json`.
- Não consultar APIs de marketplaces a cada pageview. O público consome dados previamente importados/sincronizados.

## Fluxos importantes

### Catálogo público

`/api/catalog` → `CatalogProvider` → filtros/curadoria → `ProductCard` e `ProductPage`.

Mostrar somente produtos reais publicados, com `showOnStorefront !== false`, imagem válida e listing ativo. Nunca preencher indisponibilidade com produtos fictícios. O botão de compra deve usar exclusivamente `listing.url`; não construir URLs de marketplace manualmente.

### Administração

- Entrada em `/admin`.
- Autenticação server-side em `netlify/functions/_shared/auth.ts`.
- Produtos e importação em `admin-products.ts` e `admin-import.ts`.
- Analytics em `admin-analytics.ts` e `_shared/google-analytics.ts`.
- Nunca mover credenciais para o frontend ou registrar tokens em logs.

### Analytics e consentimento

- GTM: `GTM-KLJMDZ25` via variável `VITE_GTM_ID`.
- GA4: measurement ID `G-MH9W3NFF5L`; relatórios server-side usam a Data API.
- Clarity: carregado pelo container/integração e exibido no painel quando a API responde.
- O GTM **não é carregado** antes do consentimento. `ConsentBanner` só chama `loadTagManager` quando a escolha é `granted`, e `track`/`trackEcommerce` retornam `false` sem consentimento. Nenhum script de terceiro entra na página antes da permissão — postura mais restritiva que o Consent Mode padrão, em troca de abrir mão da modelagem do Google para quem recusa.
- Consequência prática ao depurar: o Tag Assistant não conecta enquanto o consentimento não for aceito, porque não há tag do Google no DOM. Aceite o banner antes de iniciar a visualização.
- Listas de produtos usam o esquema de ecommerce do GA4 (`view_item_list` e `select_item` com `ecommerce.items[]`), o que alimenta o relatório de desempenho da lista de itens sem exploração manual. O clique de saída para o marketplace segue como evento personalizado com `list_name` e `position`.
- **Ao adicionar um evento novo, leia isto antes.** O container GTM tem uma tag de HTML personalizado, `GA4 - Acquisition Events`, que intercepta `dataLayer.push` e encaminha eventos direto ao GA4 via `gtag`, por fora das tags do GTM. Ela é quem entrega `view_product`, `view_category`, `search_product`, `filter_catalog`, `click_mercado_livre` e `click_shopee` — não existe tag nativa para esses. Ela só encaminha o que estiver na constante `ALLOWED` do próprio script. Um evento novo ou entra nessa lista, ou ganha tag própria no GTM; se ganhar tag própria **e** entrar na lista, o GA4 recebe o evento duas vezes e toda razão calculada sobre ele fica errada.
- A CSP em `netlify.toml` contém os endpoints oficiais necessários. Não adicionar `unsafe-eval` e não substituir a política por curingas amplos.
- O Search Console pode aparecer como “Aguardando dados” enquanto a conta de serviço não tiver permissão na propriedade `sc-domain:distritogeek.com.br`. Uma falha do Search Console não pode derrubar GA4 ou Clarity.

## SEO implementado

- Origem canônica sempre `https://distritogeek.com.br`.
- `www` redireciona permanentemente para o domínio sem `www`.
- Produtos têm metadata dinâmica, Open Graph e schema `Product` somente quando existe listing válido.
- Guias têm schema `Article`, breadcrumbs e links internos para produtos reais.
- `/favoritos`, `/comparar` e combinações de filtros usam `noindex, follow`.
- **Páginas de categoria específica (`/categoria/<cat>`) são `noindex` e ficam FORA do sitemap** — a página de SEO de cada tema é a landing (ex.: `/miniaturas-rpg`), não a categoria (duplicaria a intenção). Só o hub `/categoria/todos` indexa. Cliente (`metadata.ts`), edge (`edge-metadata.ts`) e sitemap concordam — travado em `seo-health.test.ts`.
- **Links de navegação (cabeçalho/rodapé) apontam para as landings indexáveis** (`/miniaturas-rpg`, `/action-figures`, `/kits-rpg`), NUNCA para `/categoria/<cat>` (`action-figures` nem é categoria real — renderizaria catálogo vazio). Travado em `SiteFooter.test.tsx`.
- **BreadcrumbList do JSON-LD usa a categoria real do produto**, batendo com o breadcrumb visível da ProductPage (Início / categoria / produto); cliente e edge emitem os mesmos três níveis. Travado em `seo-health.test.ts`.
- Rotas inexistentes retornam HTTP 404 pela Edge Function.
- Sitemap dinâmico em `netlify/functions/sitemap.ts` (função pura `sitemapPaths`) inclui produtos ativos, landings, guias e `/categoria/todos` — nada noindex.
- Integridade de links internos travada em `internal-links.test.ts` (todo `section.link`/`categoryPath`/`related`/`guideSlugs`/`relatedPaths` resolve para rota real).
- Conteúdo editorial em `src/content/guides.ts`; não gerar texto raso, repetitivo ou criado apenas para inserir palavras-chave.

## Arquivos centrais

- `src/app/router.tsx`: rotas.
- `src/domain/product.ts`: contrato normalizado do produto.
- `src/domain/storefront-presentation.ts`: regras de publicação/apresentação.
- `src/data/catalog-provider.tsx`: carregamento do catálogo.
- `src/pages/ProductPage.tsx`: detalhe e conversão para marketplace.
- `src/components/ProductDescription.tsx`: descrição estruturada.
- `src/content/guides.ts`: conteúdo editorial.
- `src/seo/metadata.ts` e `src/seo/edge-metadata.ts`: política SEO client/edge.
- `src/analytics/events.ts`: Consent Mode, GTM e eventos permitidos.
- `src/admin/AdminPage.tsx`: painel administrativo.
- `netlify.toml`: build, redirects, CSP e headers.

## Variáveis de ambiente

Consulte `.env.example`. Valores reais ficam somente na Netlify/local seguro. Principais chaves:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
- `VITE_GTM_ID`, `VITE_GOOGLE_SITE_VERIFICATION`
- `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY_B64`
- `SEARCH_CONSOLE_SITE_URL`
- `CLARITY_API_TOKEN`

Nunca imprimir valores dessas variáveis, copiar chaves do FlowOps ou versionar arquivos `.env`.

## Regras para mudanças

1. Preserve catálogo, admin, integração/importação de marketplaces e URLs públicas existentes.
2. Não introduza produtos, preços, promoções, avaliações ou estoque inventados.
3. Alterações de comportamento precisam de teste de regressão primeiro.
4. Antes de publicar, execute:

```bash
npm run typecheck
npm test -- --run
npx netlify build
git diff --check
```

5. Para publicar, use o site Netlify já vinculado. Depois valide o domínio oficial, não apenas a URL de deploy.
6. Preserve arquivos não relacionados e artefatos locais não versionados.

## Estado atual validado

- Build Netlify completo passa, incluindo Functions e Edge Function.
- 184 testes automatizados passam (`npm test -- --run`). Não há script de lint; a validação é typecheck + testes + build. `metadata-invariants.test.ts` valida canonical/robots/JSON-LD/og:image iterando TODAS as URLs indexáveis (não amostra); `seo-health.test.ts` prova que produto não público (pausado) fica fora do sitemap.
- CI no GitHub Actions (`.github/workflows/ci.yml`) roda typecheck, testes e build em todo push e PR.
- Deploy automático: o site Netlify está vinculado ao GitHub e publica a cada push em `feat/distrito-geek-storefront`.
- Painel exibe GA4, GTM, Clarity e Search Console de forma independente. Search Console conectado e respondendo; sem dados ainda porque o site é recente.
- Monitoramento de erros de frontend e Functions atrás de `SENTRY_DSN` / `VITE_SENTRY_DSN`, sem SDK e sem coleta de dado pessoal.
- 32 guias editoriais publicados, em sete clusters (miniaturas 6, rpg-mesa 2, dnd 5, pathfinder 2, mestre 4, criaturas 8, acessorios 5), todos no sitemap. Cluster criaturas fechou a família undead: goblins, orcs, mortos-vivos (panorama), esqueletos, zumbis, necromante, vampiros + dragões. Toda peça de criatura do catálogo tem guia específico. **Expansão editorial encerrada** — próximos guias só com evidência de demanda (Search Console).
- O chunk lazy `GuidePage` está em ~48 kB gzip (prosa dos 32 guias). Ainda saudável; se crescer muito rumo a 40–50 guias, considerar dividir por cluster/rota. Não afeta o bundle inicial (~133 kB gzip).
- Canonical único, páginas utilitárias noindex e 404 HTTP real foram validados em produção; a suíte `src/seo/seo-health.test.ts` trava essas invariantes por código.
- Bundle inicial ~131,8 kB gzip; a prosa dos guias vive no chunk lazy `GuidePage` (~33 kB gzip). Não deixar `guides.ts` voltar ao bundle inicial.

## Arquitetura de conteúdo e SEO — detalhes que importam ao mexer

- **Guias, code-splitting:** `src/content/guides-index.ts` é o índice leve (metadata + `productKeywords`), o único que home, catálogo, produto, landing e sitemap importam. O corpo (`src/content/guides.ts`) só entra pela rota `/guias/:slug` (lazy). Guia novo mexe nos dois arquivos; o teste de paridade em `guides.test.ts` falha se saírem de sincronia. Não importar `guides.ts` fora de `GuidePage`.
- **`productKeywords` mora no índice leve** e é a fonte única das duas direções do funil editorial: `productsForGuide` (guias→produtos) e `guidesForProduct` (produto→guias, via `guideMatchText`). Keyword curta demais casa por acidente no `includes()` — o teste exige ≥3 caracteres e minúsculas. Vazio é resposta legítima (o catálogo ainda não tem a peça).
- **Ranking produto→guia:** `guidesForProduct(searchable, catalogHaystacks, limit)` combina **especificidade semântica** (prioridade) com **raridade no catálogo** (desempate). Uma keyword só é sinal forte se for o **assunto do guia** — aparece no slug/seoTitle normalizado (acento removido, `d&d`→`dnd`). Guia sem keyword de identidade (ex.: `classes-dnd`/[mago,guerreiro]) trata suas keywords como assunto; guia com keyword de identidade (ex.: `.../pathfinder`) rankeia por ela quando casa, e trata keyword incidental que casou (ex.: 'necromante' num guia de Pathfinder) como relação fraca (`weakBase = catalogHaystacks.length+1`, acima de qualquer frequência). Isso impede que uma keyword rara e incidental sequestre o topo. A `ProductPage` passa `all.filter(isPublicProduct).map(guideMatchText)` (catálogo em memória) — o índice leve não importa o catálogo nem o corpo dos guias. Regressões em `guides.test.ts`: mortos-vivos, goblin, dragão, orc, mago→classes-dnd, necromante→necromante-rpg, vampiro→vampiros-rpg, necromante≠pathfinder-incidental, ghoul→mortos-vivos-rpg (singular). `normalizeIdentity` remove o `s` final por palavra (stemming de plural), então 'morto vivo'/'goblin' casam identidades no plural. **Higiene do seed:** `seed-integrity.test.ts` trava títulos truncados (o caso "…Pathfind"→"Pathfinder" já enganou o ranking), ids/slugs duplicados e nomes degenerados. Ao corrigir título truncado no seed, **preservar o slug** (estabilidade de URL) e só ajustar título/descrição.
- **Links internos dos guias:** grafo checado — zero órfão editorial (todo guia recebe ≥1 link contextual `section.links` ou `related` de outro guia, além do hub /guias e da sidebar). Ao adicionar guia novo, **linká-lo de um guia antigo do mesmo tema** (senão vira órfão editorial). `mortos-vivos-rpg` é o semi-hub de undead e lista/linka esqueletos e zumbis.
- **Ficha técnica:** `src/domain/product-facts.ts` extrai Especificações, Compatibilidade, Indicado para e Conteúdo da embalagem só de fatos reais (atributos, escala, título, seções da descrição). Nunca renderiza "Não informado". Reaproveita o vocabulário de cabeçalhos de `product-description.ts`.
- **Product/Offer JSON-LD:** cliente (`metadata.ts`) e edge (`edge-metadata.ts`) emitem `sku`, `url`, `category` e `offers.availability` (In/OutOfStock). Mantê-los em paridade. Sem `aggregateRating`/`review` — não há avaliação própria.
- **Landing → guia:** cada landing em `landing-pages.ts` tem `guideSlugs` (curadoria manual, validada contra `GUIDE_INDEX` em teste), não casamento automático.
- **Busca (`catalog-filters.ts`):** normaliza acento e `d&d`→`dnd`, aliases conservadores, fuzzy de 1 edição, e considera atributos do produto exceto `Marketplace` (que casaria toda peça). Não criar sinônimo que agrupe criaturas diferentes.
- **Eventos novos no código:** `product_guide_click`, `category_guide_click` e o campo `zero_results` em `search_product`. Já estão na allowlist de `events.ts`. Ainda **sem tag/trigger no GTM** — ver pendências externas.
- **Dashboard SEO (Etapas B e C):** todo o cálculo do painel mora em funções puras testadas em `netlify/functions/_shared/google-analytics.ts` (ex.: `guidePerformanceFrom`, `searchTermsFrom`, `seoBandsFrom`, `lowCtrFrom`, `contentGapsFrom`, `guideFunnelFrom`, `clusterViewFrom`, `organicLandingsFrom`, `trend`, `sumDualRange`). Etapa B (desempenho de guias, termos, faixas de oportunidade 1-3/4-10/11-20/21-40, CTR baixo, gaps) sai das linhas query×page de uma única consulta ao Search Console. Etapa C (funil editorial, visão por cluster, tendências, landings) usa relatórios GA extras: o **funil por guia depende da custom dimension `guide_slug` do GA4** e degrada para vazio (`.catch`) enquanto ela não existir — o painel mostra estado vazio, não quebra. Tendências usam relatórios GA de dois `dateRanges` (`date_range_0`=atual, `date_range_1`=anterior); `previous=0` nunca vira infinito.

## Backlog recomendado, em ordem

### P0 — medição e confiabilidade

1. Autorizar a conta de serviço na propriedade do Search Console e confirmar dados no painel.
2. Revisar “Cobertura de tags” após 24 horas; ignorar apenas URLs históricas, redirecionamentos ou falsos positivos confirmados.
3. Criar monitor sintético diário para home, catálogo, produto, sitemap, API pública e link externo válido.
4. Adicionar Sentry ou alternativa para erros reais do frontend e Functions, sem capturar dados pessoais.

### P1 — aquisição orgânica

1. Publicar clusters editoriais por intenção: classes de RPG, criaturas, escalas, pintura, conservação e montagem de campanhas.
2. Criar páginas de categoria somente quando houver produtos reais suficientes e conteúdo exclusivo.
3. Acrescentar imagens editoriais próprias, tabelas comparativas e links contextuais entre guias, categorias e produtos.
4. Acompanhar consultas em posição 4–20 e atualizar páginas com impressões altas e CTR baixo.
5. Conquistar links legítimos em comunidades, blogs e parceiros de RPG; evitar compra de backlinks e conteúdo em massa.

### P1 — conversão para marketplace

1. Medir CTR externo por produto, posição do card e marketplace.
2. Testar CTAs mais claros, bloco de confiança, disponibilidade e comparação de escala sem simular urgência.
3. Criar módulos “ideal para”, “o que vem no kit” e “compatibilidade” usando somente dados reais.
4. Adicionar compartilhamento de produto e guia com parâmetros UTM consistentes.

### P2 — experiência e retenção

1. Melhorar busca com sinônimos, tolerância a erros e sugestões por intenção.
2. Criar coleções editoriais salvas no admin sem duplicar produtos ou preços.
3. Adicionar alertas de retorno/estoque somente quando houver fonte real e consentimento adequado.
4. Implementar calendário editorial no admin com rascunho, revisão, publicação e atualização programada.

### P2 — performance e manutenção

1. Dividir os bundles público e administrativo ainda mais e acompanhar o orçamento de JavaScript.
2. Automatizar Lighthouse em CI com limites de regressão.
3. Adicionar verificação automática de links de marketplace expirados e imagens quebradas.
4. Documentar rollback e recuperação de Netlify Blobs com teste periódico.

## Configuração externa pendente (feita nos painéis, fora do código)

O código destes itens está pronto; falta só a configuração nos painéis:

- **GTM — eventos novos:** criar trigger + tag GA4 (ou incluir na tag HTML `GA4 - Acquisition Events`) para `product_guide_click`, `category_guide_click`; e garantir que `search_product` já publicado carregue o novo campo `zero_results`. Não marcar ecommerce nesses. Lembrar da regra: ou entra na lista `ALLOWED` da tag HTML, ou ganha tag própria — nunca os dois (duplica no GA4).
- **GTM — funil editorial e `view_item`:** pendências herdadas das sessões anteriores (tags/triggers de `guide_*` e `view_item`, remoção de `view_product` do ALLOWED, custom dimensions `guide_slug`/`guide_cluster`/`destination_slug`/`product_id`). **O funil editorial e a visão por cluster do painel só populam quando a custom dimension `guide_slug` existir no GA4** — até lá mostram estado vazio.
- **Search Console:** autorizar a conta de serviço na propriedade `sc-domain:distritogeek.com.br`. Integração já responde HTTP 200; falta volume de dados. Todo o painel de SEO (desempenho de guias, termos, faixas, CTR baixo, gaps) só popula quando houver dados.

## Trabalho recente (2026-08-11) e o que falta

Rodada 1 (SEO de produto + guias base): ficha técnica (`product-facts.ts`); Product/Offer JSON-LD com sku/url/availability; produto→guia e categoria→guia com `productKeywords` no índice leve; `orcs-rpg` religado ao produto real; busca com sinônimos/atributo/`zero_results`; cluster Acessórios com 3 guias.

Rodada 2 (dashboard + auditorias + home): fechou o cluster Acessórios (5 guias — +`aneis-status-rpg`, `marcador-concentracao-dnd`); Dashboard Etapa B (desempenho de guias, termos, faixas de oportunidade, CTR baixo); gaps de conteúdo; Dashboard Etapa C (funil editorial, visão por cluster, tendências, landings orgânicas); saúde SEO por código (`seo-health.test.ts`); auditoria de image SEO travada em teste (sem defeito encontrado); seção de guias na home abrindo as frentes temáticas.

Rodadas 3–4 (lotes de guias + auditoria + otimização): +9 guias (miniaturas/D&D/mestre/criaturas), chegando a 30; auditoria editorial completa; correção do ranking produto→guia (raridade e depois gate de especificidade semântica); resolução dos 8 órfãos editoriais; revisão de related e landings.

Rodada 5 (fechamento das oportunidades de criatura): +`necromante-rpg` e `vampiros-rpg` (produto real sem guia); correção do título truncado "Pathfind"→"Pathfinder" no seed (slug preservado) + `seed-integrity.test.ts`; stemming de plural na identidade (Ghoul→mortos-vivos-rpg); reciprocidade da família undead. 32 guias, 169 testes.

Rodada 6 (auditoria técnica pré-coleta — só correções internas, sem conteúdo novo): coerência de indexação de `/categoria/<cat>` (noindex + fora do sitemap, alinhando edge/sitemap ao cliente); BreadcrumbList do JSON-LD passa a bater com o breadcrumb visível (categoria, não landing; cliente e edge iguais); cabeçalho e rodapé deixam de linkar `/categoria/action-figures` (categoria inexistente → catálogo vazio) e apontam às landings. Novos testes permanentes: `internal-links.test.ts`, `SiteFooter.test.tsx`, paridade de categoria e de breadcrumb em `seo-health.test.ts`. 169→176 testes; bundle inicial estável (~133 kB). Auditado sem alteração: robots, OG, imagens, 404 do edge, a11y de controles, integridade de produtos — todos corretos.

Rodada 7 (reexecução da auditoria técnica): nenhum bug novo — as correções da rodada 6 seguem válidas. Reforço de cobertura: `metadata-invariants.test.ts` itera TODAS as URLs indexáveis (36 produtos + 32 guias + 7 landings + estáticas) validando canonical/robots/title/description/og:image/JSON-LD/paridade cliente↔edge/404 do edge, com as funções reais. 176→183 testes; bundle inalterado (133,17 kB). Todas as fases reauditadas — sem alteração de comportamento.

Rodada 13 (integração Mercado Livre no Radar): conectado SÓ o Mercado Livre (Shopee/TikTok/Google/scraping fora; motor intacto). (1) Mapeamento puro `src/research/mercadolivre-mapping.ts` (`mlItemToResult`/`mlItemsToResults`): item do `/sites/MLB/search` → `EvidenceDraft`; `sold` como sinal **referencial** com `note` (ausente→`unknown`, nunca 0); reviews/qtd/escala/material só de atributo estruturado (título não é inferido); comparabilidade entra `parcial`; dedupe por externalId no lote. (2) Provider server-only `netlify/functions/_shared/mercadolivre.ts`: `mlConfigured`, resolução de token (cache→Blobs `ml-oauth`→refresh OAuth rotacionado→`ML_ACCESS_TOKEN`), `searchMercadoLivre` (fetch nativo, Bearer, timeout 8s AbortController, erros auth/rate/upstream/timeout/invalid). Endpoint `admin-research-mercadolivre.ts` (admin-only, no-store, não persiste, nunca retorna token; feature-flag `configured:false`). (3) UI: `MercadoLivreSearch` na aba Evidências (busca, revisão com seleção/edição, importar→nova ResearchSession, motor recalcula). Env necessárias: `ML_ACCESS_TOKEN` OU `ML_CLIENT_ID`+`ML_CLIENT_SECRET`+`ML_REFRESH_TOKEN`. Sem env, Radar segue manual. 265→293 testes; bundle inicial estável (133,31 kB), RadarManager 10,2→11,6 kB gzip (imports type-only). Docs: `docs/provider-mercado-livre.md`. **Próximo:** Shopee Afiliados quando a conta estiver aprovada — mesmo contrato `→ Evidence[]`.

Rodada 11 (sprint Radar de Oportunidades): módulo dedicado para avaliar ideias de produto antes do cadastro, útil sem nenhuma API externa. (1) Motor puro `src/domain/opportunity.ts` (modelo zod Opportunity/ResearchSession/Evidence + funções `priceMetrics`, `marketSignals`, `demandLevel`, `competitionLevel`, `priceOutlook`, `dgFit`, `dataConfidence`, `heatmap`, `assessSession`). Heatmap por matriz demanda×concorrência ajustada por preço/aderência e **limitada pela confiança** (baixa nunca dá QUENTE; inconclusiva → INCONCLUSIVO). Preço por unidade separado do avulso; **`'unknown'` nunca vira 0**. Todo resultado carrega `reasons[]` (o "por quê"). (2) Backend privado: `netlify/functions/_shared/opportunity-store.ts` (Blobs `radar-opportunities`, helpers puros `prepareOpportunity`/`upsertOpportunity`) + endpoint `admin-opportunities.ts` (admin-only, no-store, GET/POST/PUT/DELETE). Fora do catálogo público e do sitemap. (3) UI `src/admin/RadarManager.tsx` (lazy, chunk próprio ~10 kB gzip) + `radar-helpers.ts` (puro: `guidesWithoutProduct`, `fitContextFor`, `assessOpportunity`, `filterOpportunities`). Nav Admin → Radar. Heatmap/confiança sempre com TEXTO (a11y), identidade preto/amarelo/branco, mobile (tabela→cards, drawer full-screen). **Conteúdo sem produto** (Parte 38) via índice leve, com "criar oportunidade a partir do guia". 204→260 testes, bundle inicial estável (133,27→133,31 kB gzip). **NÃO implementado de propósito (V1 manual):** scraping, APIs ML/Shopee/TikTok/Google, IA, reconhecimento de imagem, estimativa de vendas, probabilidade %. **Próximo passo para coleta automática:** criar um coletor que gere `Evidence[]` (por API ou import) e alimente uma nova sessão de pesquisa — o motor de decisão já está pronto e não muda.

Rodada 9 (sprint de consolidação): (1) modelo de visibilidade em três conceitos — novo campo `showOnHome` (default true, retrocompatível) + helper `showsOnHome`, ligado só na Home; admin com três checkboxes claros; cache do `/api/catalog` reduzido (SWR 600→60s) para propagar ocultação rápido. **O filtro de visibilidade já era correto** (todo consumidor usa `isPublicProduct`/catálogo público filtrado) — o sintoma "ocultei e continua aparecendo" era compatível com o SWR longo. (2) **SKU DG** permanente (`domain/sku.ts` + registro por id no Blobs). (3) mojibake dos labels do admin corrigido + `encoding.test.ts`. (4) "Termos SEO"→"Termos internos / busca" (não é meta keywords). (5) canal TikTok preparado no modelo. 184→204 testes, bundle inicial estável (~133 kB). **Não feito nesta rodada (Admin UI grande, próxima passada dedicada):** tabela/lista compacta do admin, drawer/tabs de edição, checklist de saúde, ações em lote, preview, simulador de preço, radar de oportunidades, mobile-admin — o modelo de dados (visibilidade, SKU, multicanal) já está pronto para eles.

Rodada 8 (reexecução — sem bug novo): sondagem fresca da consistência sitemap↔páginas indexáveis e do produto pausado. Confirmado: `/api/catalog` retorna `publicCatalog` (só `isPublicProduct`), então o edge nunca recebe produto pausado/rascunho — a URL de um produto não público dá 404 no edge e noindex no cliente, consistente. Fechada a única lacuna de cobertura: teste em `seo-health.test.ts` prova que produto não público fica fora do sitemap. 183→184 testes. **Nota latente (não bug):** o edge (`edge-metadata.ts`) casa produto por `status !== 'archived'` em vez de `=== 'published'`; é inofensivo porque a entrada já vem filtrada por `/api/catalog`, mas se algum dia o edge for alimentado com o catálogo cru, produtos pausados seriam indexados. Não alterado por não haver bug ativo.

**Expansão editorial encerrada (32 guias).** Toda peça de criatura do catálogo tem guia específico. Novos guias **só com evidência de demanda** (gaps/faixas de oportunidade do painel quando o Search Console tiver dados) — não por lista pré-definida.

Mapa produto×conteúdo (rodada 5): produtos que ainda caem em guia genérico, mas **sem gap claro** que justifique guia novo agora:
- Kits de guerreiros humanos → `classes-dnd` (arquétipo de classe cobre; sem guia dedicado de "guerreiros").
- Fenrir 75mm (besta/monstro grande) → `escala` (produto único; só criar "monstros/bestas-rpg" se aparecerem mais peças).
- Kit misto de 5 miniaturas → `como-comecar` (sem criatura única); figure anime (Kiki) → `resina-vs-plastico` (colecionável, não criatura).
Utilidades (17 produtos não-RPG) corretamente sem guia.

- **Merchant Center:** só documentar requisitos; configuração externa.
- **Depende de dados reais** (não fazer às cegas): revisar CTR baixo e gaps de conteúdo quando o Search Console tiver volume; ajustar títulos/descriptions das páginas apontadas.

## Próxima tarefa recomendada

Otimização dos 30 guias concluída e enviada. O maior retorno agora **depende de dados externos**: liberar a conta de serviço no Search Console e, com ~28 dias de dados, usar os blocos "Gaps de conteúdo", "Oportunidades de SEO" e "CTR abaixo do esperado" do painel para decidir os próximos guias e ajustes de title/description. Quando for criar conteúdo novo, começar por `necromante-rpg` e `vampiros-rpg` (têm produto real). Não publicar lote amplo às cegas.
