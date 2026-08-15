# Catálogo comercial e famílias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar famílias, cross-sell e operação comercial ao Distrito Geek preservando SEO, performance e integrações consolidadas.

**Architecture:** Reaproveitar `Product`, overrides editoriais, Netlify Blobs e `CatalogManager`. Toda regra pública será função pura sobre produtos reais; o Admin apenas edita associações confirmadas e mostra derivados operacionais.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Zod, Vitest, Netlify Functions e Netlify Blobs.

## Global Constraints

- Não alterar URLs, slugs, metadata ou schemas existentes sem evidência.
- Não criar produtos, famílias, métricas, descontos ou links de marketplace fictícios.
- Não alterar Radar, providers, SKU DG, guias ou arquitetura multicanal.
- Preservar bundle público e carregamento lazy do Admin/GuidePage/Radar.

---

### Task 1: Modelo de famílias e relações

**Files:** `src/domain/product-family.ts`, `src/domain/product-family.test.ts`, `src/domain/product.ts`, `netlify/functions/_shared/catalog-store.ts`

- [ ] Escrever testes falhando para schema de família, tipos de relação, produtos públicos relacionados e ordenação.
- [ ] Implementar schemas e seletores puros mínimos.
- [ ] Estender override editorial e persistência sem quebrar registros antigos.
- [ ] Rodar testes focados, typecheck e commit `feat(catalog): add product families and relations`.

### Task 2: Dashboard, fila e matriz operacional

**Files:** `src/admin/catalog-operations.ts`, `src/admin/catalog-operations.test.ts`, `src/admin/CatalogManager.tsx`, `src/styles/admin-catalog.css`

- [ ] Escrever testes para contagens, ações necessárias, lacunas de conteúdo e divergência de preço.
- [ ] Implementar funções determinísticas sem score.
- [ ] Integrar resumo, fila, matriz e saúde multicanal ao Admin existente.
- [ ] Validar mobile, testes, typecheck e commit `feat(admin): add catalog operations dashboard`.

### Task 3: Gestão editorial de família e relações

**Files:** `src/admin/CatalogManager.tsx`, `src/admin/CatalogManager.test.tsx`, `netlify/functions/admin-products.ts`

- [ ] Criar teste falhando para salvar família e relacionados pelo drawer.
- [ ] Implementar controles simples, prioridade numérica e validação de IDs.
- [ ] Preservar reconstrução completa do override no PATCH.
- [ ] Rodar testes, build e commit `feat(admin): manage families and cross sell`.

### Task 4: ProductPage e CTAs

**Files:** `src/pages/ProductPage.tsx`, `src/app/app-flow.test.tsx`, `src/styles/global.css`

- [ ] Criar testes para ficha, família, relações públicas e CTAs ML/Shopee/TikTok/WhatsApp.
- [ ] Implementar módulos compactos usando dados existentes e `product-facts`.
- [ ] Ignorar listing inativo e relação inválida.
- [ ] Rodar testes SEO e commit `feat(storefront): add product family cross sell`.

### Task 5: Home, novidades, filtros e busca

**Files:** `src/domain/home-curation.ts`, `src/domain/home-curation.test.ts`, `src/domain/catalog-filters.ts`, `src/domain/catalog-filters.test.ts`, `src/pages/HomePage.tsx`, `src/pages/CatalogPage.tsx`

- [ ] Criar testes para categorias reais, kits, famílias publicadas, novidades por `createdAt` e aliases determinísticos.
- [ ] Implementar apenas seções com conteúdo real e sem rota fina.
- [ ] Adicionar filtros confiáveis sem indexar parâmetros.
- [ ] Rodar testes, build e commit `feat(storefront): improve commercial discovery`.

### Task 6: Contatos, TikTok e documentação

**Files:** `src/components/SiteFooter.tsx`, `src/pages/ContactPage.tsx`, `src/app/router.tsx`, testes correspondentes, `CLAUDE.md`

- [ ] Criar regressão para e-mail e WhatsApp públicos.
- [ ] Trocar contatos públicos e mostrar TikTok somente quando houver listing/URL real.
- [ ] Atualizar `CLAUDE.md` com arquitetura, decisões e pendência da URL da loja.
- [ ] Rodar a suíte completa, registrar bundles e commit `docs: record commercial catalog architecture`.

### Task 7: Regressão SEO e finalização

**Files:** testes SEO existentes e relatório em `CLAUDE.md`

- [ ] Rodar canonical, robots, sitemap, metadata, breadcrumbs, schema, internal links, 404/redirects e visibilidade.
- [ ] Comparar URLs, titles, canonicals e schemas antes/depois.
- [ ] Rodar `npm run typecheck`, `npm test -- --run`, `npm run build`, `git diff --check`.
- [ ] Comparar bundles e documentar pendências externas sem contorná-las.

