# Curadoria comercial de Cenários RPG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classificar os dois novos cenários reais do Mercado Livre em uma família comercial curada, garantir busca conservadora e cross-sell útil, sem criar página SEO, guia ou persistência paralela.

**Architecture:** Reutilizar `CURATED_PRODUCT_FAMILIES` como fonte única da curadoria explícita. A família publicada agrupa os IDs reais e o mecanismo existente de `relatedProductsFor` gera relações bidirecionais `mesma-familia`, filtrando produtos ocultos e autorreferência. A busca continua usando a normalização atual, sem IA nem nova camada de aliases desnecessária.

**Tech Stack:** React 19, TypeScript 5.9, Vitest 3, Vite 7, catálogo sincronizado por Netlify Functions/Blobs.

## Global Constraints

- Não alterar URLs, canonicals, titles, descriptions, H1/H2, schema, sitemap, robots ou guias.
- Não criar landing para `cenarios-rpg`.
- Não inferir família por título; usar somente IDs confirmados no catálogo real.
- Não alterar preço, estoque, imagem, permalink ou dados sincronizados do marketplace.
- Não criar subtipo novo se o modelo atual não oferecer um campo editorial apropriado.
- Preservar arquivos locais não rastreados e mudanças fora do escopo.

---

### Task 1: Travar a família e o cross-sell com teste

**Files:**
- Modify: `src/domain/product-family.test.ts`
- Modify: `src/domain/product-family.ts`

**Interfaces:**
- Consumes: `CURATED_PRODUCT_FAMILIES`, `familyForProduct`, `relatedProductsFor`.
- Produces: família `family-cenarios-rpg`, slug operacional `cenarios-rpg`, com os IDs `MLB7426771372` e `MLB7427034982`.

- [x] **Step 1: Escrever o teste que falha**

Adicionar um teste que exige a família `Cenários RPG`, confirma os dois IDs e verifica relação bidirecional `mesma-familia`, sem produto oculto ou autorreferência.

- [x] **Step 2: Verificar RED**

Run: `npm test -- src/domain/product-family.test.ts --run`

Expected: FAIL porque `family-cenarios-rpg` ainda não existe.

- [x] **Step 3: Implementar o mínimo**

Adicionar uma única entrada a `CURATED_PRODUCT_FAMILIES`, com descrição comercial fornecida no briefing, prioridade que permita ao mecanismo existente considerar a família na Home e sem nova rota.

- [x] **Step 4: Verificar GREEN**

Run: `npm test -- src/domain/product-family.test.ts --run`

Expected: PASS.

### Task 2: Travar a busca dos cenários reais

**Files:**
- Modify: `src/domain/catalog-filters.test.ts`
- Modify only if the test proves necessary: `src/domain/catalog-filters.ts`

**Interfaces:**
- Consumes: `filterAndSortProducts` e normalização existente.
- Produces: resultados corretos para `cenario`, `cenário`, `cenarios`, `cenários`, `ruina`, `ruína`, `ruinas`, `ruínas`, `templo` e `dungeon`.

- [x] **Step 1: Escrever o teste com os títulos reais**

Usar fixtures locais dos dois produtos e testar todas as variações de consulta previstas no briefing.

- [x] **Step 2: Executar o teste**

Run: `npm test -- src/domain/catalog-filters.test.ts --run`

Expected: PASS se normalização/fuzzy atual já cobrir os termos; nesse caso, não alterar produção. Se falhar por uma lacuna real, manter o teste vermelho e adicionar somente o alias canônico mínimo.

### Task 3: Regressão de SEO e Admin

**Files:**
- No production changes expected beyond `src/domain/product-family.ts`.
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: testes existentes de metadata, sitemap, Admin e Home.
- Produces: registro da auditoria e das decisões conservadoras.

- [x] **Step 1: Rodar testes focados**

Run: `npm test -- src/domain/product-family.test.ts src/domain/home-curation.test.ts src/admin/catalog-manager.test.ts src/admin/commercial-insights.test.ts src/seo/metadata-invariants.test.ts src/seo/seo-health.test.ts src/seo/internal-links.test.ts --run`

- [x] **Step 2: Rodar validação completa**

Run: `npm run typecheck`

Run: `npm test -- --run`

Run: `npm run build`

Run: `git diff --check`

- [x] **Step 3: Comparar bundles e atualizar contexto**

Registrar os tamanhos de `index`, `AdminPage`, `GuidePage` e `RadarManager`, além de documentar que subtipos não foram persistidos por inexistência de campo apropriado e que nenhum guia/SEO foi criado.

- [x] **Step 4: Commit focado**

Commit: `feat(catalog): curate RPG scenery family`
