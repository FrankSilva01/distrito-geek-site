# Distrito Geek SEO, Analytics and Acquisition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add indexable editorial SEO, consented GTM/GA4 events, Search Console support and an authenticated GA4 Data API dashboard without changing the Mercado Livre synchronization.

**Architecture:** Keep the Vite React SPA and the existing Netlify catalog functions. Add shared pure SEO policy modules used by React, sitemap and a Netlify Edge middleware that injects route-specific metadata into the initial HTML; send typed public events to `dataLayer` only after consent; query aggregate reports from the GA4 Data API in an authenticated serverless function.

**Tech Stack:** React 19, React Router 7, TypeScript 5.9, Zod 4, Vitest, Netlify Functions, Netlify Edge Functions, Netlify Blobs, GA4 Data API REST, Google Tag Manager.

## Global Constraints

- Preserve the existing Mercado Livre integration, OAuth, tokens, product prices, stock, images, status and permalinks.
- Use `https://distritogeek.com.br` for every canonical URL; never emit `*.netlify.app`.
- Load GTM, GA4 and Clarity only after explicit analytics consent.
- Use GTM `GTM-KLJMDZ25` as the single tag loader; GA4 `G-MH9W3NFF5L` and Clarity `xziz3wcv43` are configured inside GTM, not duplicated in source.
- Keep `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` server-side.
- Do not send names, e-mail addresses, phone numbers, tokens or contact-form values to analytics.
- Do not create thin pages, fake products, fake reviews, fake ratings, shipping claims, return policies or checkout claims.
- Preserve or exceed the production baseline: Performance 98, Accessibility 95, Best Practices 96, SEO 100, CLS 0, LCP 2.3 s.

---

### Task 1: Extend editorial product overrides

**Files:**
- Modify: `src/domain/product.ts`
- Modify: `netlify/functions/_shared/catalog-store.ts`
- Modify: `netlify/functions/admin-products.ts`
- Modify: `src/integrations/storefront.ts`
- Test: `src/domain/product.test.ts`
- Test: `src/server/functions.test.ts`
- Test: `src/integrations/storefront.test.ts`

**Interfaces:**
- Produces optional `Product.storefrontDescription`, `Product.seoTitle`, `Product.seoDescription`, `Product.seoTags`.
- Produces `EditorialOverride` with the same optional fields and preserves marketplace-owned values.

- [ ] **Step 1: Write failing schema and override tests**

```ts
expect(productSchema.parse({ ...product, storefrontDescription: 'Descrição editorial', seoTitle: 'Kit Goblins RPG 32mm', seoDescription: 'Conheça o kit.', seoTags: ['goblins', '32mm'] })).toMatchObject({ seoTags: ['goblins', '32mm'] })
expect(applyEditorialOverrides(product, { productId: product.id, seoTitle: 'Título SEO' }).seoTitle).toBe('Título SEO')
expect(applyEditorialOverrides(product, { productId: product.id, seoTitle: 'Título SEO' }).price).toBe(product.price)
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/domain/product.test.ts src/server/functions.test.ts src/integrations/storefront.test.ts`

Expected: failures for missing editorial fields.

- [ ] **Step 3: Add optional editorial fields to schemas and PATCH persistence**

```ts
storefrontDescription: z.string().trim().optional(),
seoTitle: z.string().trim().optional(),
seoDescription: z.string().trim().optional(),
seoTags: z.array(z.string().trim().min(1)).default([]),
```

PATCH accepts only editorial fields plus existing visibility/featured fields. `applyEditorialOverrides` must spread overrides only after synchronized presentation fields are normalized and must never overwrite `price`, `stock`, `status`, `images` or `listings`.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- --run src/domain/product.test.ts src/server/functions.test.ts src/integrations/storefront.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/product.ts netlify/functions/_shared/catalog-store.ts netlify/functions/admin-products.ts src/integrations/storefront.ts src/domain/product.test.ts src/server/functions.test.ts src/integrations/storefront.test.ts
git commit -m "feat: persist product SEO editorial fields"
```

### Task 2: Create the shared SEO policy and editorial landing registry

**Files:**
- Create: `src/seo/landing-pages.ts`
- Create: `src/seo/metadata.ts`
- Create: `src/seo/metadata.test.ts`
- Create: `src/pages/SeoLandingPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Test: `src/app/app-flow.test.tsx`

**Interfaces:**
- Produces `SEO_LANDINGS: SeoLandingDefinition[]`.
- Produces `productsForLanding(definition, products): Product[]`.
- Produces `metadataForRoute(pathname, search, products): PageMetadata`.
- `PageMetadata` contains `title`, `description`, `canonical`, `robots`, `image`, `type`, `breadcrumbs`, and `structuredData`.

- [ ] **Step 1: Write failing landing and metadata tests**

```ts
expect(SEO_LANDINGS.map((item) => item.path)).toEqual(expect.arrayContaining(['/miniaturas-rpg', '/miniaturas-dnd', '/miniaturas-pathfinder', '/miniaturas-rpg-32mm', '/miniaturas-resina', '/kits-rpg', '/action-figures']))
expect(metadataForRoute('/produto/kit-goblins', '', [product]).title).toBe('Kit Goblins RPG 32mm em Resina | Distrito Geek')
expect(metadataForRoute('/categoria/todos', '?sort=price', [product]).robots).toBe('noindex, follow')
expect(metadataForRoute('/categoria/todos', '?sort=price', [product]).canonical).toBe('https://distritogeek.com.br/categoria/todos')
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/seo/metadata.test.ts src/app/app-flow.test.tsx`

Expected: module/route failures.

- [ ] **Step 3: Implement landing definitions and deterministic product matching**

Each definition contains `path`, `title`, `description`, `h1`, `intro`, `sections`, `faq`, `relatedPaths`, and a predicate based only on real category/title/description/attributes. `productsForLanding` additionally applies `isPublicProduct`.

- [ ] **Step 4: Implement route metadata fallbacks**

```ts
export type PageMetadata = {
  title: string; description: string; canonical: string
  robots: 'index, follow' | 'noindex, follow'
  image: string; type: 'website' | 'product'
  breadcrumbs: Array<{ name: string; url: string }>
  structuredData: Record<string, unknown>[]
}
```

Titles prefer `seoTitle`, descriptions prefer `seoDescription`, then storefront fields, then contextual synchronized content. Product offers use only an active allowed marketplace permalink.

- [ ] **Step 5: Build the landing page and internal links**

Render H1, intro, real product grid, useful H2 sections, contextual FAQ, breadcrumbs and links to related landing definitions. Add Home links to priority landings and product links to its best matching landing.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- --run src/seo/metadata.test.ts src/app/app-flow.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/seo src/pages/SeoLandingPage.tsx src/app/router.tsx src/pages/HomePage.tsx src/pages/ProductPage.tsx src/app/app-flow.test.tsx
git commit -m "feat: add editorial SEO landing pages"
```

### Task 3: Add analytics consent and a typed GTM data layer

**Files:**
- Create: `src/analytics/events.ts`
- Create: `src/analytics/events.test.ts`
- Create: `src/analytics/ConsentBanner.tsx`
- Create: `src/analytics/ConsentBanner.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/pages/ContactPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/vite-env.d.ts`
- Modify: `.env.example`
- Modify: `netlify.toml`

**Interfaces:**
- Produces `AnalyticsEventName`, `AnalyticsEvent`, `track(event)`, `getConsent()`, `setConsent(choice)`, `loadTagManager()`.
- Consent storage key: `distrito-geek:analytics-consent`, values `granted | denied`.

- [ ] **Step 1: Write failing consent and event tests**

```ts
expect(track({ event: 'view_product', product_id: 'p1', product_name: 'Mago', category: 'rpg', price: 39.9 })).toBe(false)
setConsent('granted')
expect(track({ event: 'click_mercado_livre', product_id: 'p1', product_name: 'Mago', marketplace: 'mercado-livre', marketplace_url: 'https://produto.mercadolivre.com.br/MLB-1' })).toBe(true)
expect(document.querySelector('script[src*="GTM-KLJMDZ25"]')).toBeNull()
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/analytics/events.test.ts src/analytics/ConsentBanner.test.tsx`

Expected: missing modules.

- [ ] **Step 3: Implement typed, allow-listed events and consent**

`track` drops unknown properties, truncates search terms, never throws and pushes to `window.dataLayer` only after `granted`. `loadTagManager` reads `import.meta.env.VITE_GTM_ID`, validates `GTM-[A-Z0-9]+`, inserts one script and returns without action otherwise.

- [ ] **Step 4: Implement banner and privacy preference control**

The first visit shows Accept and Decline buttons. The privacy page contains a button that clears/reopens the choice. No iframe `noscript` is emitted before consent because that would contact Google before a choice.

- [ ] **Step 5: Update CSP and configuration**

Add Google Tag Manager, Google Analytics and Clarity hosts only to the directives required after consent. Add `VITE_GTM_ID=` and `VITE_GOOGLE_SITE_VERIFICATION=` to `.env.example` without hardcoded production values.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- --run src/analytics/events.test.ts src/analytics/ConsentBanner.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/analytics src/main.tsx src/pages/ContactPage.tsx src/app/router.tsx src/styles/global.css src/vite-env.d.ts .env.example netlify.toml
git commit -m "feat: add consented GTM analytics"
```

### Task 4: Instrument product, category, search, filters and marketplace clicks

**Files:**
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/pages/CatalogPage.tsx`
- Modify: `src/pages/SeoLandingPage.tsx`
- Modify: `src/components/ProductCard.tsx`
- Test: `src/app/app-flow.test.tsx`
- Test: `src/analytics/events.test.ts`

**Interfaces:**
- Consumes `track(event)` from Task 3.
- Produces event payloads with only the allow-listed parameters.

- [ ] **Step 1: Write failing interaction tests**

```ts
expect(dataLayer).toContainEqual(expect.objectContaining({ event: 'view_product', product_id: product.id }))
expect(dataLayer).toContainEqual(expect.objectContaining({ event: 'search_product', search_term: 'goblin', result_count: 0 }))
expect(dataLayer).toContainEqual(expect.objectContaining({ event: 'click_mercado_livre', external_id: 'MLB123' }))
```

Also mock `track` to throw and assert the marketplace anchor still has and follows the original `href`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/app/app-flow.test.tsx src/analytics/events.test.ts`

Expected: missing events.

- [ ] **Step 3: Add route-view events and debounced search**

Fire product/category views once per route key. Debounce search by 500 ms and include `result_count`. Fire filter events only for user changes, not initial state hydration.

- [ ] **Step 4: Add non-blocking marketplace click events**

```ts
function trackMarketplaceClick(product: Product, listing: MarketplaceListing) {
  try { track(toMarketplaceClickEvent(product, listing)) } catch { /* navigation must continue */ }
}
```

Keep the exact marketplace `href`, `target` and security attributes.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- --run src/app/app-flow.test.tsx src/analytics/events.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProductPage.tsx src/pages/CatalogPage.tsx src/pages/SeoLandingPage.tsx src/components/ProductCard.tsx src/app/app-flow.test.tsx src/analytics/events.test.ts
git commit -m "feat: track storefront acquisition events"
```

### Task 5: Emit metadata in the client and initial Netlify HTML

**Files:**
- Modify: `src/components/Seo.tsx`
- Create: `netlify/edge-functions/seo.ts`
- Create: `src/seo/edge-html.ts`
- Create: `src/seo/edge-html.test.ts`
- Modify: `netlify.toml`
- Modify: `src/app/app-flow.test.tsx`

**Interfaces:**
- Consumes `metadataForRoute` from Task 2.
- Produces `injectMetadata(html, metadata, verificationToken?): string`.
- Edge middleware skips assets, functions, API and admin, calls `context.next()`, fetches `/api/catalog` for dynamic product routes, and returns the unmodified response on any failure.

- [ ] **Step 1: Write failing HTML injection tests**

```ts
const output = injectMetadata('<head><title>Fallback</title></head>', metadata)
expect(output).toContain('<title>Kit Goblins RPG 32mm em Resina | Distrito Geek</title>')
expect(output).toContain('rel="canonical" href="https://distritogeek.com.br/produto/kit-goblins"')
expect(output).toContain('application/ld+json')
expect(output).not.toContain('netlify.app')
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/seo/edge-html.test.ts src/app/app-flow.test.tsx`

Expected: missing injector.

- [ ] **Step 3: Refactor client SEO to use shared metadata**

Upsert title, description, robots, canonical, Open Graph, optional verification meta and a single JSON-LD graph. Remove the hand-written duplicate metadata policy from `Seo.tsx`.

- [ ] **Step 4: Implement safe HTML injection**

Escape attribute/text values, serialize JSON-LD with `<` escaped, replace existing managed tags and preserve scripts/styles. Mark injected elements with `data-dg-seo="true"` so replacement is deterministic.

- [ ] **Step 5: Implement Edge middleware**

Use the official `context.next()` response-transform pattern. Limit execution to HTML GET requests and return the original response on timeout, non-HTML content or catalog failure. Configure explicit Edge paths in `netlify.toml`.

- [ ] **Step 6: Run tests, typecheck and local Netlify build**

Run: `npm test -- --run src/seo/edge-html.test.ts src/app/app-flow.test.tsx && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/Seo.tsx src/seo/edge-html.ts src/seo/edge-html.test.ts netlify/edge-functions/seo.ts netlify.toml src/app/app-flow.test.tsx
git commit -m "feat: inject route SEO into initial HTML"
```

### Task 6: Align sitemap, robots and indexability

**Files:**
- Modify: `netlify/functions/sitemap.ts`
- Modify: `public/robots.txt`
- Modify: `src/server/functions.test.ts`
- Create: `src/seo/robots.test.ts`

**Interfaces:**
- Consumes `SEO_LANDINGS`, `productsForLanding`, `isPublicProduct`.
- Sitemap entries have `{ loc, lastmod? }` and escape XML.

- [ ] **Step 1: Write failing sitemap and robots tests**

```ts
expect(xml).toContain('<lastmod>2026-08-04T10:14:42.885Z</lastmod>')
expect(xml).not.toContain('/admin')
expect(xml).not.toContain(hidden.slug)
expect(xml).toContain('/miniaturas-rpg')
expect(robots).toContain('Disallow: /admin')
expect(robots).toContain('Sitemap: https://distritogeek.com.br/sitemap.xml')
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/server/functions.test.ts src/seo/robots.test.ts`

Expected: missing lastmod/landing behavior.

- [ ] **Step 3: Generate sitemap from shared indexability rules**

Include only valid public products and landings with matching products. Deduplicate URLs, use product `updatedAt`, and preserve legal/static routes. Set XML cache headers.

- [ ] **Step 4: Tighten robots rules**

Allow public assets/content and block `/admin`, `/api/admin-`, `/.netlify/functions/admin-` and other private routes without blocking CSS, JS or images.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- --run src/server/functions.test.ts src/seo/robots.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/sitemap.ts public/robots.txt src/server/functions.test.ts src/seo/robots.test.ts
git commit -m "feat: align sitemap and robots with SEO policy"
```

### Task 7: Add product SEO editing and SERP preview to admin

**Files:**
- Create: `src/admin/ProductSeoEditor.tsx`
- Create: `src/admin/ProductSeoEditor.test.tsx`
- Modify: `src/admin/AdminPage.tsx`
- Modify: `src/admin/admin-flow.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- `ProductSeoEditor({ product, onSaved })` PATCHes only editorial fields.
- Uses the same fallback helpers as public metadata.

- [ ] **Step 1: Write failing editor tests**

```ts
expect(screen.getByLabelText('Título SEO')).toHaveValue(product.seoTitle || '')
expect(screen.getByText('distritogeek.com.br/produto/kit-goblins')).toBeVisible()
expect(screen.getByText(/caracteres/)).toBeVisible()
```

Submit and assert PATCH body excludes `price`, `stock`, `listings`, `images` and `marketplaceTitle`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/admin/ProductSeoEditor.test.tsx src/admin/admin-flow.test.tsx`

Expected: missing editor.

- [ ] **Step 3: Implement accessible expandable editor**

Provide storefront title/description, SEO title/description, comma-separated internal tags, visibility, featured, character guidance and Google-style preview. Keep save errors visible and friendly.

- [ ] **Step 4: Replace the current monolithic curation row**

Move product SEO concerns out of `AdminPage.tsx`; retain imports and manual creation unchanged.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- --run src/admin/ProductSeoEditor.test.tsx src/admin/admin-flow.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/ProductSeoEditor.tsx src/admin/ProductSeoEditor.test.tsx src/admin/AdminPage.tsx src/admin/admin-flow.test.tsx src/styles/global.css
git commit -m "feat: add product SEO editor and preview"
```

### Task 8: Add authenticated GA4 Data API reporting

**Files:**
- Create: `netlify/functions/_shared/google-analytics.ts`
- Create: `netlify/functions/admin-analytics.ts`
- Modify: `src/server/functions.test.ts`
- Create: `src/admin/AnalyticsDashboard.tsx`
- Create: `src/admin/AnalyticsDashboard.test.tsx`
- Modify: `src/admin/AdminPage.tsx`
- Modify: `src/styles/global.css`
- Modify: `.env.example`

**Interfaces:**
- Produces `getGoogleAccessToken(credentials): Promise<string>` using a signed service-account JWT.
- Produces `runGa4Report(request): Promise<Ga4Report>`.
- `GET /api/admin-analytics?period=7|28|90` returns `{ configured, period, summary, topProducts, topSearches, searchesWithoutResults }`.

- [ ] **Step 1: Write failing backend configuration/auth/report tests**

```ts
expect((await callAdminAnalyticsWithoutSession()).status).toBe(401)
expect(await json(callWithMissingGaEnv())).toMatchObject({ configured: false })
expect(await json(callWithMockedGa())).toMatchObject({ configured: true, summary: { productViews: 12, marketplaceClicks: 3, externalCtr: 0.25 } })
```

- [ ] **Step 2: Run backend tests and verify RED**

Run: `npm test -- --run src/server/functions.test.ts`

Expected: missing function/helper.

- [ ] **Step 3: Implement service-account OAuth and fixed GA4 reports**

Use Node `crypto` to sign RS256 JWT assertions, exchange at `https://oauth2.googleapis.com/token`, then POST fixed reports to `https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`. Normalize multiline private keys and never return Google error bodies or credentials to clients.

- [ ] **Step 4: Aggregate report rows safely**

Only accept periods 7, 28 and 90. Calculate `externalCtr = marketplaceClicks / productViews`, returning zero for a zero denominator. Return friendly `configured: false` for missing env and HTTP 502 with a generic message for provider failure.

- [ ] **Step 5: Write failing dashboard tests**

```ts
expect(screen.getByText('Analytics ainda não configurado')).toBeVisible()
expect(screen.getByText('25%')).toBeVisible()
expect(screen.getByRole('button', { name: '28 dias' })).toBeVisible()
```

- [ ] **Step 6: Implement lazy authenticated dashboard**

Add a “SEO & Analytics” admin navigation control. Fetch only when opened; render 7/28/90-day controls, summary cards, top products, top searches and no-result searches. Never load Google client code in the public bundle.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `npm test -- --run src/server/functions.test.ts src/admin/AnalyticsDashboard.test.tsx src/admin/admin-flow.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add netlify/functions/_shared/google-analytics.ts netlify/functions/admin-analytics.ts src/server/functions.test.ts src/admin/AnalyticsDashboard.tsx src/admin/AnalyticsDashboard.test.tsx src/admin/AdminPage.tsx src/styles/global.css .env.example
git commit -m "feat: add GA4 acquisition dashboard"
```

### Task 9: Document configuration and validate production

**Files:**
- Create: `docs/operations/google-seo-analytics-setup.md`
- Create: `docs/operations/weekly-acquisition-review.md`
- Create/Update: `audit/seo-analytics-real-products.csv`
- Create/Update: `audit/seo-analytics-lighthouse.json`

**Interfaces:**
- Documents DNS TXT `google-site-verification=pRJtn_xkidOEDvUaE9KRcptB0wVfMNokn23LRPi-xto` without treating it as a secret.
- Documents all manual GTM, GA4, Clarity, Data API, service-account and Search Console steps.

- [ ] **Step 1: Write operational documentation**

Include exact Netlify variables, GTM consent/tag configuration, GA4 custom dimensions for event parameters, service-account Analytics Viewer access, Hostinger TXT insertion while preserving MX/SPF/DKIM/DMARC, Search Console verification and sitemap submission.

- [ ] **Step 2: Document weekly KPIs**

Define impressions, organic clicks, organic CTR, average position, indexed pages, product views, searches, no-result searches, external marketplace clicks and `marketplace_click_rate`. Explicitly state that clicks are not sales.

- [ ] **Step 3: Run fresh complete verification**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Validate locally in a real browser**

At 320, 375, 390, 430, 768, 1024, 1440 and 1920 px, verify Home, each landing, catalog, product, consent, admin SEO editor, analytics unconfigured state and 404. Assert no horizontal overflow and that declining consent creates no GTM request.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/operations
git commit -m "docs: add SEO and analytics operations guide"
```

- [ ] **Step 6: Deploy the verified build**

Run:

```bash
npx netlify deploy --prod --dir=dist --functions=netlify/functions --site=d1bf09bb-7a20-4ea9-b270-9947e4a3749f --message "Distrito Geek: SEO, consented analytics and acquisition intelligence" --json
```

Edge Functions must be included by `netlify.toml` in the deploy.

- [ ] **Step 7: Validate production HTML and catalog integrity**

Use `curl` and a browser to verify initial HTML title, description, canonical, robots, Open Graph and JSON-LD for one product and each indexable landing; verify sitemap excludes hidden/admin routes and includes `lastmod`; confirm all real products retain their external ID, status, price and exact marketplace permalink.

- [ ] **Step 8: Run and compare Lighthouse**

Run Lighthouse against `https://distritogeek.com.br/` and at least one product. Save JSON results, compare to 98/95/96/100, CLS 0 and LCP 2.3 s, and investigate any meaningful regression before completion.

- [ ] **Step 9: Report manual activation status honestly**

Report code and deploy separately from configuration. Do not claim GA4, Clarity, Data API or Search Console collection until tags are published, environment variables exist, consent is accepted in a live test and Google verification succeeds.
