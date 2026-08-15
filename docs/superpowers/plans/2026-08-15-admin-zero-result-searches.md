# Admin Zero-Result Search Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir no Admin sinais reais de buscas internas e recalcular deterministicamente se o catálogo atual atende cada intenção.

**Architecture:** O relatório `admin-analytics` consulta `search_product` no GA4 usando a dimensão padrão `searchTerm`, agrega os dados em helpers server-side e retorna sinais sem inferir datas ausentes. Um helper puro no domínio cruza esses sinais com o catálogo administrativo e com oportunidades existentes do Radar; uma seção dedicada do Admin renderiza o resultado e reutiliza as APIs e o estado atuais.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, GA4 Data API, Netlify Functions.

## Global Constraints

- Não depender de `zero_results` para o estado atual.
- Matching com catálogo e Radar deve ser conservador; dúvida resulta em `INCONCLUSIVO`.
- “Última ocorrência” somente vem de `dateHourMinute` real do GA4.
- Não criar persistência, dependência, API externa, produto, guia ou oportunidade.
- Não alterar Radar, Home, ProductPage, SEO, sitemap, robots ou canonical.
- Bundle público não pode crescer por importação desta feature.

---

### Task 1: Compartilhar normalização e agregar sinais reais do GA4

**Files:**
- Modify: `src/domain/catalog-filters.ts`
- Modify: `src/domain/catalog-filters.test.ts`
- Modify: `netlify/functions/_shared/google-analytics.ts`
- Modify: `src/server/google-analytics.test.ts`

**Interfaces:**
- Produces: `normalizeCatalogIntent(value: string): string`
- Produces: `isCatalogSearchNoise(value: string): boolean`
- Produces: `searchSignalsFrom(rows: GoogleRow[]): SearchSignal[]`
- Consumes: `commercialDimensionFilter(...)`

- [ ] **Step 1: escrever testes falhando para normalização compartilhada**

```ts
expect(normalizeCatalogIntent('  Órcs ')).toBe('orc')
expect(normalizeCatalogIntent('32 mm')).toBe('32mm')
expect(normalizeCatalogIntent('miniaturas')).toBe('miniatura')
expect(normalizeCatalogIntent('moedas')).toBe('moeda')
```

- [ ] **Step 2: executar o teste e confirmar falha por export inexistente**

Run: `npm test -- --run src/domain/catalog-filters.test.ts`

- [ ] **Step 3: implementar a normalização mínima e reutilizá-la na busca pública**

```ts
export function normalizeCatalogIntent(value: string): string {
  const normalized = normalizeSearch(value).replace(/(\d+)\s+mm\b/g, '$1mm')
  return normalized.split(' ').map((term) => SAFE_CANONICAL_TERMS[term] || term).join(' ')
}
```

- [ ] **Step 4: escrever testes falhando para agrupamento, ruído, última ocorrência e deduplicação**

```ts
expect(searchSignalsFrom(rows)).toEqual([{
  normalizedTerm: 'orc', variants: ['orc', 'Orcs'], searches: 8,
  users: 3, sessions: 4, lastOccurredAt: '2026-08-15T18:42:00.000Z'
}])
```

- [ ] **Step 5: executar o teste e confirmar falha por helper inexistente**

Run: `npm test -- --run src/server/google-analytics.test.ts`

- [ ] **Step 6: implementar agregação e consulta GA4**

```ts
gaReport(token, property, {
  dateRanges,
  dimensions: [{ name: 'searchTerm' }, { name: 'dateHourMinute' }],
  metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }, { name: 'sessions' }],
  dimensionFilter: commercialDimensionFilter({
    filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'search_product' } },
  }),
  limit: 500,
}).catch(empty)
```

Agrupar somente datas válidas; métricas ausentes ficam `undefined`. Ordenar por buscas decrescentes e termo.

- [ ] **Step 7: rodar os testes direcionados até ficarem verdes**

Run: `npm test -- --run src/domain/catalog-filters.test.ts src/server/google-analytics.test.ts`

---

### Task 2: Classificar sinais contra catálogo e Radar sem matching agressivo

**Files:**
- Create: `src/admin/catalog-search-opportunities.ts`
- Create: `src/admin/catalog-search-opportunities.test.ts`

**Interfaces:**
- Consumes: `SearchSignal[]`, `Product[]`, `Opportunity[]`, `filterAndSortProducts(...)`, `normalizeCatalogIntent(...)`
- Produces: `catalogSearchOpportunities(signals, products, radarState): CatalogSearchOpportunity[]`
- Produces: `filterCatalogSearchOpportunities(rows, filter): CatalogSearchOpportunity[]`

- [ ] **Step 1: escrever testes falhando para todas as classificações**

```ts
expect(statusFor('goblin', publicGoblin, [])).toBe('resolvido')
expect(statusFor('orc', hiddenOrc, [])).toBe('produto-oculto')
expect(statusFor('moeda', [], [safeRadarMatch])).toBe('oportunidade-radar')
expect(statusFor('dragao', publicDragonMissedBySearch, [])).toBe('busca-nao-encontrou')
expect(statusFor('xpto ambíguo', [], [])).toBe('inconclusivo')
expect(statusFor('token', [], [])).toBe('sem-produto')
```

- [ ] **Step 2: executar e confirmar falha por módulo inexistente**

Run: `npm test -- --run src/admin/catalog-search-opportunities.test.ts`

- [ ] **Step 3: implementar precedência e correspondência conservadora**

```ts
const precedence = [
  'resolvido', 'busca-nao-encontrou', 'produto-oculto',
  'oportunidade-radar', 'sem-produto', 'inconclusivo',
] as const
```

Usar a busca pública real para `RESOLVIDO`. Correspondência segura exige igualdade da intenção normalizada ou tokens canônicos completos; múltiplos candidatos incompatíveis resultam em `INCONCLUSIVO`.

- [ ] **Step 4: acrescentar testes de resolução automática, ambiguidade, filtros e ordenação**

```ts
expect(afterPublishing[0].status).toBe('resolvido')
expect(filterCatalogSearchOpportunities(rows, 'produto-oculto')).toHaveLength(1)
expect(rows.map((row) => row.searches)).toEqual([8, 5, 2])
```

- [ ] **Step 5: rodar os testes direcionados até ficarem verdes**

Run: `npm test -- --run src/admin/catalog-search-opportunities.test.ts`

---

### Task 3: Adicionar a seção compacta ao Admin e o resumo agregado

**Files:**
- Create: `src/admin/CatalogSearchOpportunities.tsx`
- Create: `src/admin/CatalogSearchOpportunities.test.tsx`
- Modify: `src/admin/AdminPage.tsx`
- Modify: `src/admin/admin-flow.test.tsx`
- Modify: `src/styles/admin-analytics.css`

**Interfaces:**
- Consumes: `analytics.searchSignals`, catálogo administrativo e GET `/api/admin-opportunities`
- Produces: navegação `Buscas sem resultado`, tabela, filtros e ações somente leitura
- Produces: um único resumo em `Ações necessárias`

- [ ] **Step 1: escrever testes falhando para navegação, tabela, filtros e estados**

```tsx
expect(screen.getByRole('button', { name: /buscas sem resultado/i })).toBeInTheDocument()
await user.click(screen.getByRole('button', { name: /buscas sem resultado/i }))
expect(await screen.findByText('PRODUTO OCULTO')).toBeInTheDocument()
expect(screen.getByText(/sinal de procura/i)).toBeInTheDocument()
```

- [ ] **Step 2: executar e confirmar falha pela seção ausente**

Run: `npm test -- --run src/admin/CatalogSearchOpportunities.test.tsx src/admin/admin-flow.test.tsx`

- [ ] **Step 3: implementar componente e carregamento somente leitura do Radar**

```tsx
<CatalogSearchOpportunities
  signals={analytics?.searchSignals ?? []}
  products={products}
  onOpenCatalog={...}
  onOpenRadar={...}
/>
```

O fetch de Radar deve distinguir `loading`, `ok` e `error`; erro não produz associação nem contagem falsa.

- [ ] **Step 4: integrar a navegação e um resumo agregado no Dashboard**

```tsx
<button onClick={() => setActiveSection('searches')}>
  <MagnifyingGlass /> Buscas sem resultado
</button>
```

- [ ] **Step 5: adicionar CSS responsivo reutilizando tabela/card do Admin**

Sem biblioteca ou gráfico novo. No mobile, a tabela usa os mesmos `data-label` e breakpoints do catálogo administrativo.

- [ ] **Step 6: rodar testes direcionados até ficarem verdes**

Run: `npm test -- --run src/admin/CatalogSearchOpportunities.test.tsx src/admin/admin-flow.test.tsx`

---

### Task 4: Validar contrato, performance e produção

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: feature completa
- Produces: documentação do estado final e evidência de regressão

- [ ] **Step 1: executar validação completa**

```powershell
npm run typecheck
npm test -- --run
npm run build
git diff --check
```

- [ ] **Step 2: comparar bundles**

Baseline: público `135.31 kB gzip`, Admin `130.62 kB gzip`, Radar `11.64 kB gzip`, GuidePage `48.22 kB gzip`.

- [ ] **Step 3: validar manualmente o Admin em desktop e mobile**

Confirmar: termos reais ou estado vazio real, filtros, datas, status, ações, ausência de erros de console e `/admin` com `noindex, follow`.

- [ ] **Step 4: atualizar `CLAUDE.md` e revisar o diff apenas do escopo**

- [ ] **Step 5: criar commit funcional**

```bash
git add CLAUDE.md netlify/functions/_shared/google-analytics.ts src/domain/catalog-filters.ts src/domain/catalog-filters.test.ts src/server/google-analytics.test.ts src/admin/catalog-search-opportunities.ts src/admin/catalog-search-opportunities.test.ts src/admin/CatalogSearchOpportunities.tsx src/admin/CatalogSearchOpportunities.test.tsx src/admin/AdminPage.tsx src/admin/admin-flow.test.tsx src/styles/admin-analytics.css
git commit -m "feat(admin): surface zero-result catalog opportunities"
```

- [ ] **Step 6: push, aguardar Netlify e revalidar produção**

Confirmar commit publicado, smoke test e a nova seção com dados reais sem inventar valores.
