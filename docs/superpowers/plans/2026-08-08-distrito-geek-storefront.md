# Distrito Geek Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, validar e publicar no Netlify um catálogo independente da Distrito Geek com painel administrativo próprio, importação de anúncios e páginas de produto que redirecionam aos marketplaces.

**Architecture:** Uma SPA React/TypeScript consome Netlify Functions tipadas. As funções guardam produtos e configurações no Netlify Blobs, aplicam autenticação administrativa por cookie assinado e expõem somente o catálogo publicado. O build inclui dados iniciais gerados da planilha para que a primeira publicação nunca dependa de uma importação manual.

**Tech Stack:** React 19, TypeScript 5, Vite 7, React Router, TanStack Query, Zod, Papa Parse, SheetJS, Netlify Functions, Netlify Blobs, Vitest, Testing Library e Playwright para verificação final.

## Global Constraints

- O projeto e a autenticação são exclusivos da Distrito Geek e não compartilham código, dados ou usuários com o FlowOps.
- O visual deve reproduzir o mockup selecionado: fundo preto-azulado, superfícies escuras, bordas finas, texto claro e amarelo como ação principal.
- Não existe carrinho ou checkout próprio; comprar abre o anúncio externo correspondente.
- A área administrativa fica em `/admin` e toda escrita exige cookie de sessão `HttpOnly`, `Secure` e `SameSite=Strict`.
- Registros incompletos, pausados ou com URL inválida não podem aparecer no catálogo público.
- Os dois anúncios cujo título começa com `Qa Codex` não entram no catálogo inicial.
- O anúncio pausado permanece importado, mas não publicado.
- Nenhum segredo, senha ou cookie pode ser versionado ou registrado em logs.

---

### Task 1: Fundação do projeto e contratos de domínio

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `netlify.toml`
- Create: `src/domain/product.ts`
- Create: `src/domain/product.test.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `Product`, `MarketplaceListing`, `ProductStatus`, `productSchema`, `publicProductSchema`, `canPublishProduct(product): boolean`.

- [ ] **Step 1: Write the failing domain tests**

```ts
it('recusa publicação sem imagem e URL de compra segura', () => {
  expect(canPublishProduct(makeProduct({ images: [] }))).toBe(false)
  expect(canPublishProduct(makeProduct({ listings: [{ marketplace: 'mercado-livre', externalId: 'MLB1', url: 'javascript:alert(1)', active: true }] }))).toBe(false)
})

it('aceita produto completo com anúncio HTTPS permitido', () => {
  expect(canPublishProduct(makeProduct())).toBe(true)
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/domain/product.test.ts`
Expected: FAIL because `canPublishProduct` and the schemas do not exist.

- [ ] **Step 3: Implement the contracts and strict publication rule**

```ts
export const listingSchema = z.object({
  marketplace: z.enum(['mercado-livre', 'shopee', 'other']),
  externalId: z.string().trim().min(1),
  url: z.string().url().refine(isAllowedMarketplaceUrl),
  active: z.boolean(),
})

export function canPublishProduct(product: Product) {
  return product.title.trim().length >= 8 && product.description.trim().length >= 20 &&
    product.price > 0 && product.images.length > 0 &&
    product.listings.some((listing) => listing.active && isAllowedMarketplaceUrl(listing.url))
}
```

- [ ] **Step 4: Run domain tests and type-check**

Run: `npm test -- src/domain/product.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit the foundation**

```bash
git add package.json vite.config.ts tsconfig.json netlify.toml src/domain src/test
git commit -m "feat: establish distrito geek domain contracts"
```

### Task 2: Importador e catálogo inicial

**Files:**
- Create: `scripts/import-marketplace.mjs`
- Create: `src/import/normalize-row.ts`
- Create: `src/import/normalize-row.test.ts`
- Create: `src/data/catalog.seed.json`
- Create: `src/data/seed-loader.ts`

**Interfaces:**
- Consumes: `Product`, `productSchema`.
- Produces: `normalizeMarketplaceRow(row, index): ImportResult`, `loadSeedCatalog(): Product[]`.

- [ ] **Step 1: Write failing normalization tests for the supplied columns**

```ts
it('normaliza uma linha ativa do Mercado Livre', () => {
  const result = normalizeMarketplaceRow({
    'Título': 'Miniatura Mago RPG 32mm Resina', 'Preço': '99,90', Marketplace: 'Mercado Livre',
    'ID Externo': 'MLB4883770099', Status: 'Ativo', Estoque: '4'
  }, 2)
  expect(result.product?.price).toBe(99.9)
  expect(result.product?.listings[0].marketplace).toBe('mercado-livre')
})

it('marca Qa Codex como ignorado e pausado como não publicado', () => {
  expect(normalizeMarketplaceRow({ 'Título': 'Qa Codex UI', Status: 'Ativo' }, 3).ignored).toBe(true)
  expect(normalizeMarketplaceRow({ 'Título': 'Deadpool artesanal', Status: 'Pausado' }, 4).product?.status).toBe('paused')
})
```

- [ ] **Step 2: Run the import tests and confirm RED**

Run: `npm test -- src/import/normalize-row.test.ts`
Expected: FAIL because the normalizer is missing.

- [ ] **Step 3: Implement normalization, CSV/XLS parsing and deterministic IDs**

```ts
export type ImportResult = { row: number; ignored: boolean; product?: Product; errors: string[] }
export function normalizeMarketplaceRow(row: Record<string, unknown>, index: number): ImportResult {
  const title = String(row['Título'] ?? '').trim()
  if (/^qa codex/i.test(title)) return { row: index, ignored: true, errors: [] }
  const status = /pausad/i.test(String(row.Status)) ? 'paused' : 'draft'
  return { row: index, ignored: false, product: buildProduct(row, status), errors: [] }
}
```

- [ ] **Step 4: Generate the seed and validate every record**

Run: `npm run import:seed -- "../../inputs/anuncios.csv" && npm test -- src/import/normalize-row.test.ts && npm run typecheck`
Expected: PASS; seed excludes `Qa Codex`, preserves paused status, and reports incomplete drafts.

- [ ] **Step 5: Commit the importer and seed**

```bash
git add scripts src/import src/data
git commit -m "feat: import marketplace catalog seed"
```

### Task 3: Persistência, autenticação e Functions

**Files:**
- Create: `netlify/functions/_shared/catalog-store.ts`
- Create: `netlify/functions/_shared/auth.ts`
- Create: `netlify/functions/_shared/http.ts`
- Create: `netlify/functions/catalog.ts`
- Create: `netlify/functions/admin-login.ts`
- Create: `netlify/functions/admin-session.ts`
- Create: `netlify/functions/admin-products.ts`
- Create: `netlify/functions/admin-import.ts`
- Create: `netlify/functions/functions.test.ts`

**Interfaces:**
- Consumes: `Product`, `productSchema`, `publicProductSchema`, `canPublishProduct`.
- Produces: `CatalogStore`, `signSession(subject, secret, now)`, `verifySession(cookie, secret, now)`, HTTP handlers under `/.netlify/functions/*`.

- [ ] **Step 1: Write failing tests for signed sessions and public isolation**

```ts
it('rejects a modified session token', async () => {
  const token = await signSession('admin@distritogeek.com.br', 'secret-long-enough', new Date())
  await expect(verifySession(token + 'x', 'secret-long-enough', new Date())).rejects.toThrow()
})

it('catalog returns only complete published products', async () => {
  const response = await catalogHandler(mockRequest(), mockContextWithProducts([published, draft, paused]))
  expect((await response.json()).products.map((item: Product) => item.status)).toEqual(['published'])
})
```

- [ ] **Step 2: Run Functions tests and confirm RED**

Run: `npm test -- netlify/functions/functions.test.ts`
Expected: FAIL because the store, auth and handlers are missing.

- [ ] **Step 3: Implement signed sessions, rate limiting, version checks and Blob-backed storage**

```ts
export interface CatalogStore {
  list(): Promise<Product[]>
  get(id: string): Promise<Product | null>
  put(product: Product, expectedVersion?: number): Promise<Product>
  import(products: Product[]): Promise<{ accepted: number; rejected: ImportIssue[] }>
}

export async function requireAdmin(request: Request) {
  const token = readCookie(request.headers.get('cookie'), 'dg_admin')
  return verifySession(token, requiredEnv('SESSION_SECRET'), new Date())
}
```

- [ ] **Step 4: Run Functions tests and build**

Run: `npm test -- netlify/functions/functions.test.ts && npm run build`
Expected: PASS with no client bundle reference to admin secrets.

- [ ] **Step 5: Commit the server layer**

```bash
git add netlify netlify.toml
git commit -m "feat: add secure netlify catalog services"
```

### Task 4: Sistema visual, navegação e página inicial

**Files:**
- Create: `src/main.tsx`
- Create: `src/app/router.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/components/SiteHeader.tsx`
- Create: `src/components/SiteFooter.tsx`
- Create: `src/components/ProductCard.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/HomePage.test.tsx`
- Create: `public/assets/hero-distrito-geek.webp`
- Create: `public/assets/category-*.webp`

**Interfaces:**
- Consumes: public catalog endpoint returning `{ products: Product[] }`.
- Produces: `/`, reusable `SiteHeader`, `SiteFooter`, `ProductCard`.

- [ ] **Step 1: Generate and inspect the raster assets required by the mockup**

Create a wide dark fantasy tabletop-miniatures hero at 1920×820, plus consistent 4:3 category images for Action Figures, Miniaturas RPG and Wargames. Save optimized WebP files under `public/assets` and inspect each crop before use.

- [ ] **Step 2: Write the failing home interaction test**

```tsx
it('renders the hero and navigates from a featured product', async () => {
  renderApp('/')
  expect(await screen.findByRole('heading', { name: /seu universo geek/i })).toBeVisible()
  await user.click(await screen.findByRole('link', { name: /ver detalhes de miniatura mago/i }))
  expect(mockLocation()).toMatch(/\/produto\//)
})
```

- [ ] **Step 3: Run the home test and confirm RED**

Run: `npm test -- src/pages/HomePage.test.tsx`
Expected: FAIL because the router and page do not exist.

- [ ] **Step 4: Implement the measured responsive layout**

Use a 1200px content grid, 72px desktop header, 48/32/24/16/8 spacing scale, compact squared cards, yellow `#F4B900` actions and high-contrast focus rings. Implement mobile navigation and all visible hover/focus/loading/empty states.

- [ ] **Step 5: Run tests and commit the public shell**

Run: `npm test -- src/pages/HomePage.test.tsx && npm run build`
Expected: PASS.

```bash
git add src public
git commit -m "feat: build distrito geek storefront home"
```

### Task 5: Catálogo, filtros e detalhes com zoom

**Files:**
- Create: `src/pages/CatalogPage.tsx`
- Create: `src/pages/ProductPage.tsx`
- Create: `src/components/ProductGallery.tsx`
- Create: `src/components/CatalogFilters.tsx`
- Create: `src/pages/catalog-flow.test.tsx`

**Interfaces:**
- Consumes: router, `ProductCard`, `Product` and public catalog.
- Produces: `/categoria/:slug`, `/produto/:slug`, `ProductGallery({ images, title })`.

- [ ] **Step 1: Write failing filter, gallery and outbound-link tests**

```tsx
it('filters by category and price without hiding the result count', async () => {
  renderApp('/categoria/miniaturas-rpg')
  await user.click(await screen.findByLabelText('Até R$ 100'))
  expect(screen.getByText(/produtos encontrados/i)).toBeVisible()
})

it('changes the main image and updates zoom origin with pointer movement', async () => {
  renderApp('/produto/miniatura-mago-rpg')
  await user.click(await screen.findByRole('button', { name: /imagem 2/i }))
  fireEvent.pointerMove(screen.getByTestId('zoom-image'), { clientX: 75, clientY: 40 })
  expect(screen.getByTestId('zoom-image')).toHaveStyle({ transformOrigin: expect.any(String) })
})
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/pages/catalog-flow.test.tsx`
Expected: FAIL because catalog, gallery and detail routes are missing.

- [ ] **Step 3: Implement filters, pagination, thumbnails, pointer zoom and marketplace CTAs**

The gallery uses real `<img>` elements with `object-fit: contain`; pointer coordinates are clamped to 0–100%, and touch devices use tap-to-open instead of hover zoom. External links use `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 4: Run tests, accessibility assertions and build**

Run: `npm test -- src/pages/catalog-flow.test.tsx && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit the catalog experience**

```bash
git add src/pages src/components
git commit -m "feat: add searchable catalog and product gallery"
```

### Task 6: FAQ, contato e painel administrativo

**Files:**
- Create: `src/pages/FaqPage.tsx`
- Create: `src/pages/ContactPage.tsx`
- Create: `src/admin/AdminLoginPage.tsx`
- Create: `src/admin/AdminDashboardPage.tsx`
- Create: `src/admin/ProductEditor.tsx`
- Create: `src/admin/BulkImporter.tsx`
- Create: `src/admin/admin-flow.test.tsx`

**Interfaces:**
- Consumes: admin session/products/import Functions and domain schemas.
- Produces: `/faq`, `/contato`, `/admin`, `/admin/produtos/:id`.

- [ ] **Step 1: Write failing admin workflow tests**

```tsx
it('shows friendly login errors and never renders raw objects', async () => {
  server.use(failedLogin({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' }))
  renderApp('/admin')
  await fillAndSubmitLogin()
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
})

it('previews an import and blocks invalid rows before confirmation', async () => {
  renderAuthenticatedAdmin()
  await uploadCsv('Título,Preço\nProduto incompleto,0')
  expect(await screen.findByText(/1 linha com erro/i)).toBeVisible()
  expect(screen.getByRole('button', { name: /confirmar importação/i })).toBeDisabled()
})
```

- [ ] **Step 2: Run admin tests and confirm RED**

Run: `npm test -- src/admin/admin-flow.test.tsx`
Expected: FAIL because admin routes and components are missing.

- [ ] **Step 3: Implement accessible public forms and the complete admin flow**

Use labeled controls, inline validation, readable error summaries, CSV/XLS preview, status badges with explicit foreground/background colors, save conflict messaging and logout. Contact submission opens the configured email client and does not claim server delivery.

- [ ] **Step 4: Run all UI tests and build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit secondary pages and admin**

```bash
git add src/pages src/admin src/app
git commit -m "feat: add exclusive distrito geek administration"
```

### Task 7: Verificação visual e fluxos reais locais

**Files:**
- Create: `design-qa.md`
- Create: `output/playwright/home-desktop.png`
- Create: `output/playwright/product-desktop.png`
- Create: `output/playwright/home-mobile.png`

**Interfaces:**
- Consumes: complete local app and selected mockup.
- Produces: blocking `design-qa.md` with `final result: passed`.

- [ ] **Step 1: Start the visual preview and the Netlify-compatible integration runtime**

Run the visual target with `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`; for authenticated Functions flows, run `npm run dev:netlify` in a second process.
Expected: the Vite preview is reachable on port 4173, and the Netlify integration runtime reports no startup errors on its configured port.

- [ ] **Step 2: Open the app in the approved in-app Browser and verify primary journeys**

Check home navigation, catalog filters, product thumbnails/zoom, outbound marketplace link, admin login failure, authenticated CRUD, import preview and logout. Inspect the console after each route-changing flow.

- [ ] **Step 3: Capture matching desktop and mobile states**

Capture the home at 1440×960, product at 1440×960 and home at 390×844 into `output/playwright/`.

- [ ] **Step 4: Compare reference and implementation, fix every P0/P1/P2, and repeat**

Record visible spacing, typography, crop, contrast and responsive differences in `design-qa.md`. Repeat captures until the exact final line is `final result: passed`.

- [ ] **Step 5: Run the full local verification and commit**

Run: `npm test && npm run typecheck && npm run build && git diff --check`
Expected: all commands PASS.

```bash
git add design-qa.md output/playwright src public
git commit -m "test: verify distrito geek production experience"
```

### Task 8: Netlify production deployment and live verification

**Files:**
- Modify: `README.md`
- Create: `.env.example`

**Interfaces:**
- Consumes: verified build, authenticated Netlify CLI and production environment variables.
- Produces: independent Netlify production URL and documented operational setup.

- [ ] **Step 1: Document environment requirements without values**

```dotenv
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
CONTACT_EMAIL=
```

README must document password hash generation, first login, product import, rollback and domain connection without including real credentials.

- [ ] **Step 2: Verify Netlify authentication and create/link an independent site**

Run: `npx netlify status`
Expected: authenticated account. Then run `npx netlify sites:create --name distrito-geek-catalog` only if no linked independent site exists, followed by `npx netlify link`.

- [ ] **Step 3: Set protected environment variables and deploy production**

Generate a random session secret and a one-time administrative password locally, hash the password, store only the hash/secret with `netlify env:set`, then run `npm run build && npx netlify deploy --prod --dir=dist --functions=netlify/functions`.

- [ ] **Step 4: Verify production from an unauthenticated and authenticated session**

Confirm HTTP 200 for home/catalog/product, HTTP 401 for unauthenticated admin mutation, successful admin login, Blob persistence after reload, import preview, no console errors, correct marketplace redirect and responsive rendering.

- [ ] **Step 5: Record the live URL and final commit**

```bash
git add README.md .env.example
git commit -m "docs: add distrito geek deployment operations"
git status --short
```

Expected: clean worktree and a verified production URL ready for handoff.
