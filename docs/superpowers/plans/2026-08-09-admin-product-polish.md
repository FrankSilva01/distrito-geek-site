# Admin Analytics and Product Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar analytics acionável, página de produto refinada e repositório GitHub privado.

**Architecture:** Ampliar o contrato analítico existente com agregações puras e consultas isoladas. Acrescentar apresentação editorial ao modelo existente sem duplicar comércio sincronizado.

**Tech Stack:** React 19, TypeScript, GA4 Data API, Search Console API, Netlify Functions, Vitest, GitHub CLI.

## Global Constraints

- Preservar sincronização e links reais dos marketplaces.
- Não interpretar HTML externo de descrições.
- Não versionar segredos ou artefatos temporários.
- Falhas parciais de analytics não bloqueiam o painel.

---

### Task 1: CSP e navegação

**Files:** `netlify.toml`, `src/app/router.tsx`, `src/app/app-flow.test.tsx`, `src/deploy/functions-layout.test.ts`

- [ ] Escrever testes para origem GTM em imagens e retorno ao topo.
- [ ] Confirmar falha e implementar o comportamento mínimo.
- [ ] Confirmar aprovação dos testes.

### Task 2: Analytics acionável

**Files:** `netlify/functions/_shared/google-analytics.ts`, `src/admin/AdminPage.tsx`, `src/styles/admin-analytics.css`, `src/server/google-analytics.test.ts`, `src/admin/admin-flow.test.tsx`

- [ ] Escrever testes para percentuais, produtos, Search Console e oportunidades.
- [ ] Confirmar falha e implementar consultas/agregações isoladas.
- [ ] Organizar interface em Aquisição, Comportamento, SEO e Conversão.
- [ ] Confirmar aprovação dos testes.

### Task 3: Descrição e imagens editoriais

**Files:** `src/domain/product.ts`, `netlify/functions/_shared/catalog-store.ts`, `src/pages/ProductPage.tsx`, `src/admin/AdminPage.tsx`, `src/styles/global.css`, testes correspondentes.

- [ ] Escrever testes para descrição estruturada e imagens editoriais.
- [ ] Confirmar falha e implementar modelo, curadoria e apresentação.
- [ ] Confirmar aprovação dos testes.

### Task 4: Entrega

- [ ] Executar testes, typecheck e build.
- [ ] Fazer deploy e validar produção.
- [ ] Criar repositório privado, configurar remote e enviar a branch.
