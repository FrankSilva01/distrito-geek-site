# Distrito Geek Curadoria e Refinamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar a vitrine Distrito Geek e adicionar curadoria editorial persistente sem alterar OAuth, sincronização ou dados comerciais do Mercado Livre.

**Architecture:** O contrato externo continuará sendo convertido por `mapStorefrontProduct`; uma camada de overrides em Netlify Blobs será mesclada pelo ID antes da publicação. Funções puras cuidarão de título, disponibilidade, faixas de preço, categorias editoriais e diversidade da Home, deixando as páginas focadas em renderização.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, React Router 7, Zod 4, Vitest, Testing Library, Netlify Functions e Netlify Blobs.

## Global Constraints

- Não modificar OAuth, tokens, refresh token, endpoint de sincronização ou schema externo.
- Não consultar o Mercado Livre por pageview ou por card.
- Produtos publicados existentes são visíveis por padrão.
- “Utilidades Geek” permanece no catálogo, mas não aparece nas áreas promovidas da Home.
- A Home mostra no máximo oito produtos e evita famílias visualmente repetidas.
- Links de compra usam somente permalinks válidos recebidos da integração.
- Nenhum CTA da Shopee é exibido sem URL real válida.
- Não adicionar biblioteca pesada para animação ou UI.
- O projeto não possui script `lint`; registrar isso na validação em vez de inventar um comando.

---

### Task 1: Modelo editorial e apresentação do produto

**Files:**
- Modify: `src/domain/product.ts`
- Test: `src/domain/product.test.ts`
- Create: `src/domain/storefront-presentation.ts`
- Test: `src/domain/storefront-presentation.test.ts`

**Interfaces:**
- Produces: `Product.marketplaceTitle?: string`, `Product.storefrontTitle?: string`, `Product.showOnStorefront: boolean`.
- Produces: `displayTitle(product: Product): string`.
- Produces: `availabilityLabel(product: Product): 'Disponível' | 'Produção sob demanda' | 'Indisponível'`.
- Produces: `isPublicProduct(product: Product): boolean`.

- [ ] **Step 1: Write failing schema and presentation tests**

```ts
it('defaults editorial visibility safely', () => {
  const parsed = productSchema.parse({ ...validProduct, showOnStorefront: undefined })
  expect(parsed.showOnStorefront).toBe(true)
})

it('prefers storefront title and normalizes the marketplace fallback', () => {
  expect(displayTitle({ ...validProduct, marketplaceTitle: 'Kit 5 Miniaturas Rpg 32mm Resina 8k D&d' }))
    .toBe('Kit 5 Miniaturas RPG 32mm Resina 8K D&D')
  expect(displayTitle({ ...validProduct, storefrontTitle: 'Kit de aventureiros em resina' }))
    .toBe('Kit de aventureiros em resina')
})

it('only reports made to order when the real copy says so', () => {
  expect(availabilityLabel({ ...validProduct, stock: 0, description: 'Produzido sob demanda.' }))
    .toBe('Produção sob demanda')
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/domain/product.test.ts src/domain/storefront-presentation.test.ts`  
Expected: FAIL because the editorial fields and helpers do not exist.

- [ ] **Step 3: Add minimal types and pure helpers**

```ts
// product.ts
marketplaceTitle: z.string().trim().optional(),
storefrontTitle: z.string().trim().optional(),
showOnStorefront: z.boolean().default(true),

// storefront-presentation.ts
export const normalizeStorefrontTitle = (title: string) => title
  .replace(/\bRpg\b/gi, 'RPG')
  .replace(/\b8k\b/gi, '8K')
  .replace(/\bD\s*&\s*d\b/gi, 'D&D')

export const displayTitle = (product: Product) =>
  product.storefrontTitle?.trim() || normalizeStorefrontTitle(product.marketplaceTitle || product.title)

export const isPublicProduct = (product: Product) =>
  product.status === 'published' && product.showOnStorefront && canPublishProduct(product)
```

Implement `availabilityLabel` with status/listing first, stock second, and a case-insensitive `sob demanda` check only as a data-backed fallback.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/domain/product.test.ts src/domain/storefront-presentation.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/product.ts src/domain/product.test.ts src/domain/storefront-presentation.ts src/domain/storefront-presentation.test.ts
git commit -m "feat: add storefront editorial product fields"
```

---

### Task 2: Mapear integração sem alterar dados comerciais

**Files:**
- Modify: `src/integrations/storefront.ts`
- Test: `src/integrations/storefront.test.ts`

**Interfaces:**
- Consumes: campos editoriais definidos na Task 1.
- Produces: `mapStorefrontProduct(row)` com título original preservado e defaults seguros.

- [ ] **Step 1: Write failing adapter tests**

```ts
it('preserves the marketplace title separately from storefront presentation', () => {
  const product = mapStorefrontProduct({ ...realListing, title: 'Miniatura Rpg 8k', raw_payload: {} })
  expect(product.marketplaceTitle).toBe('Miniatura Rpg 8k')
  expect(product.storefrontTitle).toBeUndefined()
  expect(product.showOnStorefront).toBe(true)
})

it('reads existing editorial values without changing price or permalink', () => {
  const product = mapStorefrontProduct({
    ...realListing,
    price: 94.9,
    marketplace_url: 'https://produto.mercadolivre.com.br/MLB-123-valid-_JM',
    raw_payload: { storefrontTitle: 'Kit RPG', showOnStorefront: false, featured: true },
  })
  expect(product).toMatchObject({ storefrontTitle: 'Kit RPG', showOnStorefront: false, featured: true, price: 94.9 })
  expect(product.listings[0].url).toContain('MLB-123-valid')
})
```

- [ ] **Step 2: Run adapter tests and verify failure**

Run: `npm test -- --run src/integrations/storefront.test.ts`  
Expected: FAIL on missing editorial properties.

- [ ] **Step 3: Map only editorial fields**

Set `marketplaceTitle` from `row.title`, map `storefrontTitle` from snake/camel case payload keys, default `showOnStorefront` to `true`, and leave `price`, `stock`, `images`, `status`, `updatedAt` and `marketplace_url` untouched.

- [ ] **Step 4: Run adapter tests**

Run: `npm test -- --run src/integrations/storefront.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/storefront.ts src/integrations/storefront.test.ts
git commit -m "feat: preserve storefront editorial metadata"
```

---

### Task 3: Overrides editoriais persistentes e painel administrativo

**Files:**
- Modify: `netlify/functions/_shared/catalog-store.ts`
- Modify: `netlify/functions/admin-products.ts`
- Modify: `src/admin/AdminPage.tsx`
- Test: `src/server/functions.test.ts`
- Test: `src/admin/admin-flow.test.tsx`

**Interfaces:**
- Consumes: `Product` editorial da Task 1.
- Produces: `EditorialOverride = Pick<Product, 'storefrontTitle' | 'showOnStorefront' | 'featured'> & { id: string }`.
- Produces: `listEditorialOverrides()`, `saveEditorialOverride(override)`, `listCuratedProducts()` e merge por `product.id`.

- [ ] **Step 1: Write failing persistence and UI tests**

```ts
it('merges editorial values without overwriting synchronized commerce data', async () => {
  // Mock synchronized price 94.90 and stored override hidden + featured.
  const products = await listCuratedProducts()
  expect(products[0]).toMatchObject({ price: 94.9, showOnStorefront: false, featured: true })
})

it('lets an admin toggle storefront visibility and featured state', async () => {
  render(<AdminPage />)
  expect(await screen.findByLabelText('Mostrar na vitrine')).toBeChecked()
  await user.click(screen.getByLabelText('Produto em destaque'))
  await user.click(screen.getByRole('button', { name: 'Salvar curadoria' }))
  expect(fetch).toHaveBeenCalledWith('/api/admin-products', expect.objectContaining({ method: 'PATCH' }))
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/server/functions.test.ts src/admin/admin-flow.test.tsx`  
Expected: FAIL because overrides and PATCH do not exist.

- [ ] **Step 3: Add a separate Blob key and safe merge**

Use `EDITORIAL_KEY = 'storefront-editorial-overrides'`. Store only the four editorial properties. Extraia o carregamento sincronizado com cache para `listCuratedProducts()`, aplique o merge antes do filtro público e faça `listPublicProducts()` retornar `publicCatalog(await listCuratedProducts())`:

```ts
const applyOverride = (product: Product, override?: EditorialOverride): Product => override
  ? { ...product, storefrontTitle: override.storefrontTitle, showOnStorefront: override.showOnStorefront, featured: override.featured }
  : product
```

Do not write synchronized products into the internal products key and do not touch `FLOWOPS_STOREFRONT_URL`.

- [ ] **Step 4: Add authenticated PATCH and admin controls**

`GET /api/admin-products` usa `listCuratedProducts()` para que o painel veja produtos sincronizados e internos. `PATCH /api/admin-products` accepts only `{ id, storefrontTitle, showOnStorefront, featured }`, validates the payload with Zod, and saves the override. Render a compact curation table with title input and two checkboxes for synchronized and internal products.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/server/functions.test.ts src/admin/admin-flow.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/_shared/catalog-store.ts netlify/functions/admin-products.ts src/admin/AdminPage.tsx src/server/functions.test.ts src/admin/admin-flow.test.tsx
git commit -m "feat: add persistent storefront curation controls"
```

---

### Task 4: Seleção diversa da Home e categorias editoriais

**Files:**
- Create: `src/domain/home-curation.ts`
- Test: `src/domain/home-curation.test.ts`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/app/app-flow.test.tsx`

**Interfaces:**
- Consumes: `displayTitle`, `isPublicProduct`.
- Produces: `selectHomeFeatured(products: Product[], limit?: number): Product[]`.
- Produces: `homeCategories(products: Product[]): HomeCategory[]` where `HomeCategory = { slug; name; description; image; productCount }`.

- [ ] **Step 1: Write failing curation tests**

```ts
it('keeps utilities out and limits visually repeated families', () => {
  const result = selectHomeFeatured([
    goblinKitA, goblinKitB, actionFigure, utilityProduct, rpgMiniature,
  ], 8)
  expect(result).not.toContain(utilityProduct)
  expect(result.filter((p) => displayTitle(p).toLowerCase().includes('goblin'))).toHaveLength(1)
})

it('builds only the three approved home categories from real products', () => {
  expect(homeCategories(products).map((item) => item.slug))
    .toEqual(['miniaturas-rpg', 'action-figures', 'kits-exercitos'])
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/domain/home-curation.test.ts src/app/app-flow.test.tsx`  
Expected: FAIL because the curation module does not exist and the current Home promotes raw categories.

- [ ] **Step 3: Implement deterministic selection**

Build a family key from normalized title tokens after removing dimensions, material and marketplace suffixes. Sort featured first, then recent, while accepting at most one item per family and round-robin across category buckets. Filter `utilidades-geek` only from Home selection.

- [ ] **Step 4: Replace Home sections with approved copy and category cards**

Use “Escolha onde finalizar sua compra”, truthful benefit copy, three editorial categories, at most eight featured cards, and no Shopee CTA unless at least one real Shopee listing exists.

- [ ] **Step 5: Run tests**

Run: `npm test -- --run src/domain/home-curation.test.ts src/app/app-flow.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/home-curation.ts src/domain/home-curation.test.ts src/pages/HomePage.tsx src/app/app-flow.test.tsx
git commit -m "feat: curate diverse storefront highlights"
```

---

### Task 5: Cards, catálogo e página de produto

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/ProductGallery.tsx`
- Modify: `src/pages/CatalogPage.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Create: `src/domain/catalog-filters.ts`
- Test: `src/domain/catalog-filters.test.ts`
- Test: `src/app/app-flow.test.tsx`

**Interfaces:**
- Consumes: presentation helpers from Task 1.
- Produces: `priceRanges(products: Product[]): PriceRange[]` and `filterAndSortProducts(input): Product[]`.

- [ ] **Step 1: Write failing filter and rendering tests**

```ts
it('derives useful ranges from real public prices', () => {
  expect(priceRanges([{ ...validProduct, price: 21.9 }, { ...validProduct, id: '2', price: 750 }]))
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Até R$ 50' }),
      expect.objectContaining({ label: 'Acima de R$ 400' }),
    ]))
})

it('renders one card CTA and does not crop the product image', () => {
  render(<ProductCard product={validProduct} />)
  expect(screen.getByRole('link', { name: /ver produto/i })).toBeInTheDocument()
  expect(screen.getAllByRole('link')).toHaveLength(1)
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/domain/catalog-filters.test.ts src/app/app-flow.test.tsx`  
Expected: FAIL on missing ranges and new card semantics.

- [ ] **Step 3: Implement pure dynamic filters and sort**

Return only ranges containing products. Search against display title, marketplace title and category. Preserve `recentes`, `menor-preco`, `maior-preco` and `az` ordering without mutating the source array.

- [ ] **Step 4: Refine card and catalog markup**

Render marketplace tag, `displayTitle`, price, `availabilityLabel` and one visible “Ver produto” CTA. Use a fieldset/legend for price ranges and an accessible mobile filter layout.

- [ ] **Step 5: Refine product purchase panel**

Render “Escolha onde comprar” and one marketplace row per valid active listing. Keep the exact URL, real price and no Shopee row without a listing. Show attributes only when non-empty.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --run src/domain/catalog-filters.test.ts src/app/app-flow.test.tsx`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProductCard.tsx src/components/ProductGallery.tsx src/pages/CatalogPage.tsx src/pages/ProductPage.tsx src/domain/catalog-filters.ts src/domain/catalog-filters.test.ts src/app/app-flow.test.tsx
git commit -m "feat: refine catalog and product presentation"
```

---

### Task 6: Header, footer, SEO e acabamento visual responsivo

**Files:**
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/components/Seo.tsx`
- Modify: `src/styles/global.css`
- Test: `src/app/app-flow.test.tsx`

**Interfaces:**
- Consumes: display title and curated category routes.
- Produces: accessible navigation/footer and responsive visual system only; no data contract changes.

- [ ] **Step 1: Write failing accessibility and link tests**

```ts
it('has no placeholder links and exposes required footer destinations', () => {
  render(<App />)
  expect(document.querySelector('a[href="#"]')).toBeNull()
  expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade')
  expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos')
})
```

- [ ] **Step 2: Run app tests and verify failure**

Run: `npm test -- --run src/app/app-flow.test.tsx`  
Expected: FAIL because the policy and terms routes/links do not exist.

- [ ] **Step 3: Add real internal legal pages and footer links**

Add simple static routes in `src/app/router.tsx` using the existing page layout. Omit social icons and marketplace external links unless a real configured URL exists.

- [ ] **Step 4: Apply visual system refinements**

Update tokens and component classes so cards use square neutral media with `object-fit: contain`, sections use approximately 20% less vertical padding, anchors receive `scroll-margin-top`, and transitions are disabled under `@media (prefers-reduced-motion: reduce)`. Add mobile filter stacking and overflow guards at 320 px.

- [ ] **Step 5: Refine page-specific metadata**

Use route-aware titles/descriptions for Home, catálogo, category, product, FAQ, contato, política and termos. Preserve `https://distritogeek.com.br` as origin and product image/permalink data.

- [ ] **Step 6: Run app tests and typecheck**

Run: `npm test -- --run src/app/app-flow.test.tsx && npm run typecheck`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/router.tsx src/components/SiteHeader.tsx src/components/SiteFooter.tsx src/components/Seo.tsx src/styles/global.css src/app/app-flow.test.tsx
git commit -m "style: polish storefront navigation and responsive layout"
```

---

### Task 7: Validação integral e deploy de produção

**Files:**
- Update: `audit/real-products.csv`
- Create: `audit/refinement-lighthouse.json`
- Create: screenshots under `audit/refinement/`

**Interfaces:**
- Consumes: complete build from Tasks 1–6.
- Produces: verified production deploy and evidence report.

- [ ] **Step 1: Run the complete local verification suite**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: all tests PASS, typecheck exits 0, Vite build exits 0, and diff check has no whitespace errors. Record that `package.json` has no `lint` script.

- [ ] **Step 2: Run local responsive browser checks**

Use the built app/Netlify dev and capture Home, catálogo, categoria and produto at 320, 375, 390, 430, 768, 1024, 1366, 1440 and 1920 px. Check both themes, keyboard focus, sticky header, image containment, filters, footer, duplicate highlights and horizontal overflow.

- [ ] **Step 3: Validate marketplace safety before deploy**

Fetch `/api/catalog`, export product title, external ID, price, status and permalink, and assert:

```text
all displayed products have showOnStorefront=true
all active Mercado Livre URLs use HTTPS and an allowed Mercado Livre hostname
no Shopee CTA exists without a real listing
no production image comes from catalog.seed.json
```

- [ ] **Step 4: Deploy the exact tested build**

Run:

```bash
npx netlify deploy --prod --dir=dist --functions=netlify/functions --site=d1bf09bb-7a20-4ea9-b270-9947e4a3749f --message "Distrito Geek: curadoria e refinamento da vitrine" --json
```

Expected: exit 0 with a production deploy ID and `https://distritogeek.com.br` URL.

- [ ] **Step 5: Validate production endpoints and UX**

Confirm apex HTTP 200, `www` HTTP 301 to apex, canonical apex, sitemap excludes admin, robots blocks admin, catalog has only real records, product permalinks match source, and all requested desktop/mobile flows render correctly.

- [ ] **Step 6: Run Lighthouse against production**

Run:

```bash
npx lighthouse https://distritogeek.com.br/ --output=json --output-path=audit/refinement-lighthouse.json --chrome-flags="--headless --no-sandbox" --quiet
```

Expected targets: Performance >= 90, Accessibility >= 95, Best Practices >= 95 and SEO >= 95. If a metric regresses, inspect the failing audit and fix within the approved scope before reporting.

- [ ] **Step 7: Commit the final verified state**

```bash
git add src netlify public index.html netlify.toml
git commit -m "feat: complete Distrito Geek storefront refinement"
```

Do not add transient logs, generated Lighthouse JSON or screenshots to the source commit unless the repository explicitly tracks audit artifacts.
