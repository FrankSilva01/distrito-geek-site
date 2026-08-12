# Handoff — Distrito Geek (2026-08-11)

Leia junto com o `CLAUDE.md`, que descreve a arquitetura. Este arquivo descreve **onde
paramos** e **o que falta**.

Branch que publica: `feat/distrito-geek-storefront` (também é a padrão). A Netlify está
vinculada ao GitHub e publica automaticamente a cada push. CI em `.github/workflows/ci.yml`
roda typecheck, testes e build em todo push e PR.

Estado validado no último commit: **typecheck OK, 128 testes, build OK, git diff --check
limpo**, bundle inicial 129,56 kB gzip.

---

## 1. PENDENTE COM O FRANK — GTM

Nada disso é código. É configuração manual, e **sem ela os eventos morrem no `dataLayer`**.

Container: `GTM-KLJMDZ25` · Measurement ID GA4: `G-MH9W3NFF5L`

### Armadilhas que já custaram tempo, leia antes

- **Nome do acionador ≠ nome do evento.** O acionador pode se chamar `Evento - view_item`,
  mas o campo *Nome do evento* dentro dele tem que ser `view_item`, sem prefixo. Tem que
  bater caractere por caractere com o que o código empurra no `dataLayer`.
- **ID da métrica é `G-MH9W3NFF5L`**, com o `G-`. Só está certo quando aparece o **check
  verde** "Uma tag do Google foi encontrada neste contêiner". Amarelo = errado.
- **Consentimento.** O GTM só carrega depois que o visitante aceita o banner. Ao usar o
  Tag Assistant, **aceite o consentimento primeiro**, senão ele não conecta e parece que
  a integração quebrou.

### 1.1 Tag `view_item` — pode já estar publicada, confirme

Foi validada no Tag Assistant (evento 26, tag disparada, sem duplicação) mas não há
confirmação de que a versão foi publicada.

- Acionador `Evento - view_item`, evento personalizado, nome do evento `view_item`
- Tag `GA4 - view_item`, ID `G-MH9W3NFF5L`, nome do evento `view_item`
- **Marcar** "Enviar dados de e-commerce", fonte **Data Layer**
- Acionamento: `Evento - view_item` (e só ele)

Se em Versões não existir uma publicação contendo essa tag, publique.

### 1.2 Quatro eventos do funil editorial — NÃO configurado

O código já emite. Falta o GTM inteiro.

**Estes NÃO são eventos de e-commerce.** Não marque "Enviar dados de e-commerce".
Aqui é preciso criar variáveis, o que as tags anteriores dispensavam.

**Passo 1 — Variáveis → Definidas pelo usuário → Nova → Variável da camada de dados.**
Nome da variável igual ao nome na camada de dados:

```
guide_slug
guide_title
guide_cluster
destination_slug
product_id
product_name
```

**Passo 2 — Acionadores → Novo → Evento personalizado**, quatro deles:

| Nome do acionador | Campo "Nome do evento" |
|---|---|
| `Evento - guide_view` | `guide_view` |
| `Evento - guide_product_click` | `guide_product_click` |
| `Evento - guide_related_click` | `guide_related_click` |
| `Evento - guide_category_click` | `guide_category_click` |

**Passo 3 — Tags → Nova → Evento do Google Analytics (GA4)**, quatro delas.
ID `G-MH9W3NFF5L`, nome do evento igual ao do acionador. Em **Parâmetros de evento →
Adicionar parâmetro**, nome do parâmetro à esquerda e a variável `{{nome}}` à direita:

| Tag | Parâmetros |
|---|---|
| `GA4 - guide_view` | `guide_slug`, `guide_title`, `guide_cluster` |
| `GA4 - guide_product_click` | os três acima + `product_id`, `product_name` |
| `GA4 - guide_related_click` | os três acima + `destination_slug` |
| `GA4 - guide_category_click` | os três acima + `destination_slug` |

**Passo 4 — GA4 → Administrador → Definições personalizadas → Dimensões personalizadas**,
escopo de **evento**, para `guide_slug`, `guide_cluster`, `destination_slug`, `product_id`.
Sem isso os parâmetros chegam mas não aparecem em relatório.

**Passo 5 — Limpeza na tag `GA4 - Acquisition Events`.** É HTML personalizado que
intercepta `dataLayer.push` e encaminha eventos direto ao GA4. Remova `view_product` da
constante `ALLOWED` (o evento não existe mais no código). **Não** acrescente os `guide_*`
ali — eles têm tag própria, e adicionar duplicaria a contagem.

A constante deve ficar:

```js
var ALLOWED = { view_category: 1, search_product: 1, filter_catalog: 1, click_mercado_livre: 1, click_shopee: 1 };
```

**Passo 6 — Testar e publicar.** Visualizar → aceitar consentimento → abrir um guia,
clicar num produto do guia, num guia relacionado e no CTA. Confirmar que cada evento
dispara uma tag só. Depois Enviar → Publicar.

### 1.3 Search Console e indexação

- Solicitar indexação das páginas âncora pela barra "Inspecionar qualquer URL". Cota de
  ~10 a 12 por dia. Prioridade: home, `/categoria/todos`, `/guias`, `/guias/miniaturas-rpg`,
  as landings principais e os melhores guias.
- Sitemap já enviado e processado, 51 páginas. Não precisa reenviar.
- Métricas zeradas **não são bug**. O diagnóstico deu HTTP 200 com 0 linhas: integração
  correta, site novo, Search Console leva alguns dias para consolidar.

### 1.4 Logo nova

O arquivo em `Downloads` (`ChatGPT Image 11 de ago...png`) **não serve**: 1536×1024 sem
canal alfa, fundo preto embutido, 1,2 MB. O site tem tema claro, onde isso vira um
retângulo preto. Remover o fundo automaticamente abriria buracos no símbolo, porque o
interior do hexágono também é preto.

Precisa de **SVG vetorial** ou **PNG exportado com transparência**. E decidir se o
cabeçalho leva símbolo + texto ou só o símbolo.

---

## 2. PENDENTE DE CÓDIGO — próxima sessão

### 2.1 Ficha técnica no produto — RECOMENDADO COMEÇAR POR AQUI

`src/domain/product-facts.ts` está **pronto e com 6 testes passando**, mas **não está
ligado a nenhuma página**.

Ele extrai da descrição real do anúncio: `specs`, `compatibility`, `idealFor`, `contents`,
`scale`, `material`, `quantity`, `finish`, e devolve `remainingDescription` sem as seções
promovidas, para não repetir o mesmo texto na página.

Falta: renderizar na `ProductPage` (ficha técnica + módulos "Compatível com", "Indicado
para", "O que vem na embalagem"), enriquecer o schema `Product` com material e escala, e
usar `remainingDescription` no lugar da descrição integral.

**Por que priorizar:** os 27 produtos têm descrição **idêntica à do Mercado Livre** e
**nenhum tem `storefrontDescription`**. É conteúdo duplicado competindo com um domínio de
autoridade incomparavelmente maior. Nenhum trabalho de link ou indexação supera isso.
Depois da ficha técnica, o passo seguinte é redigir `storefrontDescription` própria para os
27, usando os fatos extraídos como base factual.

### 2.2 Links categoria → guia

Fechar a bidirecionalidade. Na `CatalogPage` e nas landings, bloco discreto "Aprenda mais
sobre miniaturas" com poucos links para guias reais. Guia → categoria já existe via
`categoryPath`.

### 2.3 Dashboard — Etapas B e C

Nada iniciado além dos eventos. O briefing completo está no histórico da conversa. Resumo:

**Etapa B:** desempenho dos guias no Google (`/guias/*` do Search Console, consulta
agregada, nunca uma chamada por guia), seção de termos de pesquisa com ordenação,
oportunidades SEO (posição 4–10 e 11–20, sem "SEO score" inventado), e visão de guias no
Search Console.

**Etapa C:** funil guia → produto (`product clicks / guide views`, tratando divisão por
zero), produto mais clicado por guia, visão por cluster, tendências período atual vs
anterior (com "15 novos" em vez de +∞% quando o anterior for zero), e landing pages
orgânicas classificadas por tipo.

**Regras que valem para tudo:** preservar os três estados `ok` / `empty` / `error` já
implementados em `settleSearchConsole`; nunca misturar visualizações do GA4 com impressões
do Search Console; consultas agregadas com cache, porque Search Console não é realtime;
preservar o design atual do painel.

---

## 3. DECISÕES TOMADAS QUE NÃO DEVEM SER REFEITAS

- **Landings vs guias.** `src/seo/landing-pages.ts` atende intenção comercial
  ("miniaturas rpg 32mm"); os guias atendem intenção informacional. Duas páginas do site
  nunca disputam a mesma consulta. Os artigos existentes de D&D e Pathfinder seguem sendo
  as páginas principais desses termos; o pilar `/guias/miniaturas-rpg` linka para eles em
  vez de competir.
- **Índice leve separado do conteúdo.** `guides-index.ts` tem só metadata e é importado
  por hub, sitemap e política de metadata. `guides.ts` tem a prosa e é importado só pela
  rota do guia, carregada sob demanda. Um teste de paridade falha se saírem de sincronia.
  **Ao adicionar guia, mexa nos dois arquivos.**
- **Sentry sem SDK.** O `@sentry/browser` custava 144 kB gzip mesmo com tree-shaking. A
  implementação atual fala o protocolo de envelope direto, custa ~1 kB e nenhuma
  dependência. Contrapartida aceita: agrupamento por tipo + mensagem + rota, sem frames.
- **Consentimento bloqueia o GTM inteiro**, não só os eventos. É mais restritivo que o
  Consent Mode padrão e foi mantido de propósito.
- **`orcs-rpg` sem `productKeywords`** de propósito: não existe miniatura de orc no
  catálogo, e `orc` como substring daria falso positivo. Preencher quando houver produto.

---

## 4. CREDENCIAIS E ACESSOS

- Service account em uso: `distrito-geek-analytics-reader@projeto-geral-783a0.iam.gserviceaccount.com`,
  no projeto Cloud `projeto-geral-783a0`, com Analytics Data API e Search Console API
  habilitadas, Leitor no GA4 e Total no Search Console.
- Existe uma service account **antiga** (`@distrito-geek-analytics.iam...`) ainda com
  acesso ao GA4 e ao Search Console, num projeto Cloud que o Frank não enxerga. Ele optou
  por não removê-la. Fica o registro de que é uma chave sem dono controlável.
- GA4: propriedade `549179539`, conta `404023122`, administrada por `distrito.geek.ofc@gmail.com`.
  Search Console é de `frankalves333@gmail.com`. Cloud abre por padrão numa terceira conta.
  Três contas Google diferentes — vale consolidar.
- Sentry: projeto `distrito-geek`, região **`de`**, host `o4511883014635521.ingest.de.sentry.io`,
  fixado exatamente na CSP.

---

## 5. COMANDOS

```bash
npm install
npm run typecheck
npm test -- --run
npm run build
git diff --check
```

`npx netlify build` exige `netlify login` e `netlify link` — não roda em clone novo.
`vite` puro não serve `/api/catalog` (é Netlify Function): para preview local, criar
temporariamente `public/api/catalog` com `{"products": <conteúdo de src/data/catalog.seed.json>}`
e apagar depois.
