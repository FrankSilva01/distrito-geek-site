# Contexto para continuidade — Distrito Geek

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
- Rotas inexistentes retornam HTTP 404 pela Edge Function.
- Sitemap dinâmico em `netlify/functions/sitemap.ts` inclui produtos ativos, landings e guias.
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
- 137 testes automatizados passam (`npm test -- --run`).
- CI no GitHub Actions (`.github/workflows/ci.yml`) roda typecheck, testes e build em todo push e PR.
- Deploy automático: o site Netlify está vinculado ao GitHub e publica a cada push em `feat/distrito-geek-storefront`.
- Painel exibe GA4, GTM, Clarity e Search Console de forma independente. Search Console conectado e respondendo; sem dados ainda porque o site é recente.
- Monitoramento de erros de frontend e Functions atrás de `SENTRY_DSN` / `VITE_SENTRY_DSN`, sem SDK e sem coleta de dado pessoal.
- 19 guias editoriais publicados, em sete clusters (miniaturas, rpg-mesa, dnd, pathfinder, mestre, criaturas, acessorios), todos no sitemap.
- Canonical único, páginas utilitárias noindex e 404 HTTP real foram validados em produção.

## Arquitetura de conteúdo e SEO — detalhes que importam ao mexer

- **Guias, code-splitting:** `src/content/guides-index.ts` é o índice leve (metadata + `productKeywords`), o único que home, catálogo, produto, landing e sitemap importam. O corpo (`src/content/guides.ts`) só entra pela rota `/guias/:slug` (lazy). Guia novo mexe nos dois arquivos; o teste de paridade em `guides.test.ts` falha se saírem de sincronia. Não importar `guides.ts` fora de `GuidePage`.
- **`productKeywords` mora no índice leve** e é a fonte única das duas direções do funil editorial: `productsForGuide` (guias→produtos) e `guidesForProduct` (produto→guias, via `guideMatchText`). Keyword curta demais casa por acidente no `includes()` — o teste exige ≥3 caracteres e minúsculas. Vazio é resposta legítima (o catálogo ainda não tem a peça).
- **Ficha técnica:** `src/domain/product-facts.ts` extrai Especificações, Compatibilidade, Indicado para e Conteúdo da embalagem só de fatos reais (atributos, escala, título, seções da descrição). Nunca renderiza "Não informado". Reaproveita o vocabulário de cabeçalhos de `product-description.ts`.
- **Product/Offer JSON-LD:** cliente (`metadata.ts`) e edge (`edge-metadata.ts`) emitem `sku`, `url`, `category` e `offers.availability` (In/OutOfStock). Mantê-los em paridade. Sem `aggregateRating`/`review` — não há avaliação própria.
- **Landing → guia:** cada landing em `landing-pages.ts` tem `guideSlugs` (curadoria manual, validada contra `GUIDE_INDEX` em teste), não casamento automático.
- **Busca (`catalog-filters.ts`):** normaliza acento e `d&d`→`dnd`, aliases conservadores, fuzzy de 1 edição, e considera atributos do produto exceto `Marketplace` (que casaria toda peça). Não criar sinônimo que agrupe criaturas diferentes.
- **Eventos novos no código:** `product_guide_click`, `category_guide_click` e o campo `zero_results` em `search_product`. Já estão na allowlist de `events.ts`. Ainda **sem tag/trigger no GTM** — ver pendências externas.

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
- **GTM — funil editorial e `view_item`:** pendências herdadas das sessões anteriores (tags/triggers de `guide_*` e `view_item`, remoção de `view_product` do ALLOWED, custom dimensions `guide_slug`/`guide_cluster`/`destination_slug`/`product_id`). Ver o contexto de continuidade original.
- **Search Console:** autorizar a conta de serviço na propriedade `sc-domain:distritogeek.com.br`. Integração já responde HTTP 200; falta volume de dados.

## Trabalho recente (2026-08-11) e o que falta

Concluído nesta sessão (5 commits locais em `feat/distrito-geek-storefront`, **ainda não enviados**):
1. Ficha técnica real na ProductPage (`product-facts.ts`).
2. Product/Offer JSON-LD com sku/url/availability (cliente + edge).
3. Produto→guia e categoria→guia; `productKeywords` movido para o índice leve; guia `orcs-rpg` religado ao produto "Miniatura De Orcs".
4. Busca: sinônimos de domínio, busca por atributo, sinal `zero_results`.
5. Cluster Acessórios com 3 guias novos (tokens-rpg, marcadores-iniciativa-rpg, spell-slot-tracker).

Falta, em ordem sugerida (não bloqueado por config externa, salvo indicado):
- **Fase 2 — Dashboard Etapa B/C e gaps de conteúdo:** desempenho de `/guias/*` no Search Console, termos de pesquisa, faixas de oportunidade, funil `guide_view → guide_product_click → …`, visão por cluster. Depende de dados do Search Console (hoje vazios) — preparar estados `empty` sem zero silencioso.
- **Fase 3 — auditorias:** saúde SEO (sitemap/canonical/robots/404/redirects via código), image SEO (alt/dimensões/lazy), home e mobile.
- **Fase 4 — guias restantes do lote:** `marcador-concentracao-dnd`, `aneis-status-rpg` (fecham os 5 de acessórios), depois o lote de miniaturas/mestre/criaturas. Lotes de 3–5, sem canibalizar.

## Próxima tarefa recomendada

Enviar os 5 commits locais (o push dispara deploy automático na Netlify — confirmar com o Franklin antes). Depois seguir a Fase 2 do dashboard com estados vazios, e fechar o lote de acessórios com os dois guias restantes.
