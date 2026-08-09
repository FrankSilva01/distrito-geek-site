# Product Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add useful product discovery tools without changing marketplace synchronization or checkout behavior.

**Architecture:** Keep engagement state local to the visitor and persist only product IDs in localStorage. Resolve those IDs against the existing synchronized catalog so prices, images, status, and marketplace links always remain authoritative.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, existing CSS design tokens.

## Global Constraints

- Do not change the Mercado Livre integration, schema, Netlify, or domain configuration.
- Never copy price, stock, images, or marketplace URLs into browser storage.
- Comparison is limited to three products.
- Recently viewed is limited to eight unique products.
- Preserve keyboard navigation, visible focus, mobile layout, and light/dark themes.

---

### Task 1: Engagement state

**Files:**
- Create: `src/domain/product-engagement.test.ts`
- Create: `src/domain/product-engagement.ts`
- Create: `src/data/product-engagement.tsx`

**Interfaces:**
- Produces: `EngagementState`, `normalizeEngagement`, `toggleFavoriteState`, `toggleCompareState`, `recordRecentState`, `EngagementProvider`, `useProductEngagement`.

- [ ] Write tests for normalization, toggles, the three-product comparison limit, and unique recent ordering.
- [ ] Run the test and confirm it fails because the module does not exist.
- [ ] Implement the pure state helpers and localStorage-backed provider.
- [ ] Run the focused test and confirm it passes.

### Task 2: Storefront controls and pages

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Create: `src/components/ComparisonTray.tsx`
- Create: `src/pages/FavoritesPage.tsx`
- Create: `src/pages/ComparePage.tsx`
- Modify: `src/app/router.tsx`
- Create: `src/styles/product-engagement.css`

**Interfaces:**
- Consumes: `useProductEngagement()` and the existing `useCatalog()`.
- Produces: `/favoritos`, `/comparar`, card actions, header counter, and comparison tray.

- [ ] Write an interaction test proving a visitor can favorite and compare a real catalog card.
- [ ] Run the test and confirm it fails before controls exist.
- [ ] Add accessible card controls, routes, pages, header counter, and tray.
- [ ] Run the focused interaction test and confirm it passes.

### Task 3: Recent products and product guidance

**Files:**
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/styles/product-engagement.css`

**Interfaces:**
- Consumes: `recordRecent(product.id)` and catalog product attributes.
- Produces: recent-product shelf and factual scale guidance derived from synchronized data.

- [ ] Write a focused test for scale extraction.
- [ ] Run the test and confirm it fails before the helper exists.
- [ ] Record viewed products, render the recent shelf, and show scale guidance only when present in product data.
- [ ] Run focused tests and confirm they pass.

### Task 4: Release verification

**Files:**
- Modify: `.superdesign/init/*`
- Modify: `.superdesign/design-system.md`

**Interfaces:**
- Produces: a documented canvas direction and a verified production release.

- [ ] Run the complete test suite, typecheck, and production build.
- [ ] Inspect the changed file list and exclude unrelated artifacts.
- [ ] Commit and push the branch.
- [ ] Deploy to Netlify production and validate desktop/mobile user flows.
