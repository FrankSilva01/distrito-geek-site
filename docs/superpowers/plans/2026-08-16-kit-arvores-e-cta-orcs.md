# Kit 10 Árvores e CTA dos Orcs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o Kit 10 Árvores no Mercado Livre e restaurar o CTA seguro do produto legado de Orcs no Distrito Geek.

**Architecture:** O anúncio será criado pela interface oficial do Mercado Livre, usando a sessão autenticada e os dados aprovados. No site, a integração existente continuará sendo a única origem do catálogo; apenas permalinks HTTP de hosts oficiais do Mercado Livre serão promovidos para HTTPS na fronteira de mapeamento, mantendo intacta a rejeição de hosts e protocolos inseguros.

**Tech Stack:** React 19, TypeScript 5.9, Vitest 3, Vite 7, Netlify e Mercado Livre Seller.

## Global Constraints

- Não alterar Home, guias, Radar, SEO, sitemap, schemas ou providers.
- Não criar produto paralelo manual no catálogo Distrito Geek.
- Não aceitar HTTP genericamente nem relaxar `isAllowedMarketplaceUrl`.
- Não inventar atributos, avaliações, vendas, promoção ou dados do produto.
- Preservar o permalink real retornado pela integração, alterando somente o protocolo HTTP para HTTPS em domínio oficial do Mercado Livre.
- Produto: Kit 10 Árvores, 9 modelos diferentes e 1 repetido, PLA sem pintura, R$ 39,90, estoque 10, Premium e disponibilidade em 5 dias.
- Dimensões aproximadas por modelo: 17,48–36,14 mm de largura, 17,71–34,16 mm de profundidade e 31,73–39,30 mm de altura.

---

### Task 1: Baseline e reprodução documentada

**Files:**
- Inspect: `src/integrations/storefront.ts`
- Inspect: `src/integrations/storefront.test.ts`
- Inspect: `src/admin/commercial-insights.ts`

**Interfaces:**
- Consumes: `mapStorefrontProduct(row: StorefrontListing): Product` e `isAllowedMarketplaceUrl(value: string): boolean`.
- Produces: evidência de baseline e reprodução do permalink HTTP do produto `DG-MIN-000038`.

- [ ] **Step 1: Executar o baseline completo**

Run:

```powershell
npm run typecheck
npm test -- --run
npm run build
git diff --check
```

Expected: todos os comandos terminam com código 0; registrar quantidade de testes e tamanhos dos bundles.

- [ ] **Step 2: Confirmar a causa no dado real**

No Admin, abrir `DG-MIN-000038` e conferir na aba Canais que o anúncio ativo usa:

```text
http://produto.mercadolivre.com.br/MLB-4883900951-miniatura-de-orcs-_JM
```

Expected: a aba Visibilidade mostra Publicado, enquanto a tabela/relatório classifica o produto como sem saída pública porque `isAllowedMarketplaceUrl` exige HTTPS.

### Task 2: Normalização segura do permalink legado

**Files:**
- Modify: `src/integrations/storefront.ts:1-94`
- Test: `src/integrations/storefront.test.ts:1-90`

**Interfaces:**
- Consumes: `StorefrontListing.marketplace_url?: string`.
- Produces: `normalizeStorefrontMarketplaceUrl(value: string): string`, usado por `mapStorefrontProduct` antes de criar `Product.listings`.

- [ ] **Step 1: Escrever o teste que falha para o host oficial em HTTP**

Adicionar em `src/integrations/storefront.test.ts`:

```ts
it('upgrades legacy Mercado Livre HTTP permalinks to HTTPS', () => {
  const product = mapStorefrontProduct({
    ...realListing,
    marketplace_url: 'http://produto.mercadolivre.com.br/MLB-4883900951-miniatura-de-orcs-_JM',
  })
  expect(product.listings[0].url).toBe('https://produto.mercadolivre.com.br/MLB-4883900951-miniatura-de-orcs-_JM')
})

it('does not upgrade HTTP URLs from untrusted hosts', () => {
  const product = mapStorefrontProduct({ ...realListing, marketplace_url: 'http://example.com/MLB-1' })
  expect(product.listings[0].url).toBe('http://example.com/MLB-1')
})
```

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run:

```powershell
npm test -- --run src/integrations/storefront.test.ts
```

Expected: o teste do permalink legado falha porque o resultado ainda começa com `http://`; o teste de host não confiável passa.

- [ ] **Step 3: Implementar a normalização mínima**

Adicionar antes de `mapStorefrontProduct` em `src/integrations/storefront.ts`:

```ts
export function normalizeStorefrontMarketplaceUrl(value: string): string {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    const mercadoLivreHost = host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br') ||
      host === 'mercadolibre.com' || host.endsWith('.mercadolibre.com')
    if (url.protocol === 'http:' && mercadoLivreHost) {
      url.protocol = 'https:'
      return url.toString()
    }
  } catch {
    return trimmed
  }
  return trimmed
}
```

Dentro de `mapStorefrontProduct`, calcular:

```ts
const marketplaceUrl = normalizeStorefrontMarketplaceUrl(stringValue(row.marketplace_url))
```

E criar a listagem usando:

```ts
listings: marketplaceUrl ? [{ marketplace, externalId, url: marketplaceUrl, active: status === 'published' }] : [],
```

- [ ] **Step 4: Executar os testes focados**

Run:

```powershell
npm test -- --run src/integrations/storefront.test.ts src/domain/product.test.ts src/admin/commercial-insights.test.ts
```

Expected: todos passam; a política de HTTPS e a classificação comercial permanecem cobertas.

- [ ] **Step 5: Commitar a correção isolada**

```powershell
git add src/integrations/storefront.ts src/integrations/storefront.test.ts
git commit -m "fix(catalog): upgrade legacy Mercado Livre links"
```

### Task 3: Publicar o Kit 10 Árvores no Mercado Livre

**Files:**
- Read: `C:/Users/Frank/AppData/Local/Temp/codex-clipboard-f0ced743-8e4b-496f-b1ad-7d0a4a25d7eb.png`
- Read: `C:/Users/Frank/AppData/Local/Temp/codex-clipboard-874afb8b-dc18-414c-9547-ee9ebd6787d1.png`
- Read: `C:/Users/Frank/AppData/Local/Temp/codex-clipboard-82f7a8be-b212-4410-bcb9-ba3cb8226270.png`
- Read: dimension screenshots supplied in the approved specification.

**Interfaces:**
- Consumes: título, descrição, preço, estoque, modalidade, prazo, medidas e imagens fornecidos pelo usuário.
- Produces: anúncio Mercado Livre publicado com permalink e ID reais.

- [ ] **Step 1: Abrir o fluxo de criação na conta autenticada**

Usar a interface do Mercado Livre da sessão existente e selecionar a categoria mais específica disponível para cenário/terreno de RPG.

- [ ] **Step 2: Preencher os dados comerciais aprovados**

```text
Título: Kit 10 Árvores RPG Cenário 3D Floresta Dungeon Wargame
Preço: R$ 39,90
Estoque: 10
Tipo de anúncio: Premium
Prazo de disponibilidade: 5 dias
Condição: Novo
Material: PLA
Acabamento: Sem pintura
Quantidade do kit: 10 árvores
```

- [ ] **Step 3: Inserir descrição e medidas sem extrapolar os dados**

Usar o texto aprovado e acrescentar em Especificações:

```text
Dimensões aproximadas por árvore: variam conforme o modelo, com cerca de 1,75 a 3,61 cm de largura, 1,77 a 3,42 cm de profundidade e 3,17 a 3,93 cm de altura.
```

- [ ] **Step 4: Enviar as imagens comerciais**

Usar como principal a foto frontal limpa do conjunto físico (`codex-clipboard-82f7a8be-b212-4410-bcb9-ba3cb8226270.png`). Usar as outras duas fotografias reais como imagens secundárias. Não enviar capturas do fatiador.

- [ ] **Step 5: Revisar a prévia antes da publicação**

Expected: título, preço, estoque, Premium, prazo de 5 dias, quantidade 10, imagens e descrição correspondem ao aprovado; nenhum dado inventado aparece.

- [ ] **Step 6: Publicar e ativar promoção quando a opção estiver disponível**

Expected: anúncio ativo; registrar ID e permalink retornados pelo Mercado Livre. Se a promoção exigir orçamento ou contratação adicional não previamente autorizada, não confirmar custo e registrar a pendência.

### Task 4: Validação, deploy e sincronização

**Files:**
- Modify: `CLAUDE.md`
- Verify: `src/integrations/storefront.ts`
- Verify: `src/integrations/storefront.test.ts`

**Interfaces:**
- Consumes: commit da correção e permalink do novo anúncio.
- Produces: deploy de produção validado, CTA do Orc restaurado e estado de sincronização do Kit 10 Árvores documentado.

- [ ] **Step 1: Atualizar o contexto técnico**

Adicionar ao topo de `CLAUDE.md` uma nota curta contendo causa do CTA, normalização HTTPS, testes e estado real da sincronização do novo anúncio, sem registrar credenciais.

- [ ] **Step 2: Rodar a validação completa**

```powershell
npm run typecheck
npm test -- --run
npm run build
git diff --check
```

Expected: todos os comandos com código 0; comparar testes e bundles com o baseline.

- [ ] **Step 3: Commitar a documentação de continuidade**

```powershell
git add CLAUDE.md
git commit -m "docs: record tree listing and Orc CTA validation"
```

- [ ] **Step 4: Publicar a branch de produção**

```powershell
git push origin HEAD:feat/distrito-geek-storefront
```

Expected: Netlify cria deploy de produção para o novo commit e alcança estado Published/ready.

- [ ] **Step 5: Validar o Orc em produção**

No Admin, confirmar que `DG-MIN-000038` deixa de aparecer como `SEM CTA`, que a URL do Mercado Livre é HTTPS e que a página pública mostra o botão de compra com o permalink normalizado.

- [ ] **Step 6: Validar a sincronização do Kit 10 Árvores**

Consultar `/api/catalog` e o Admin. Se a sincronização já tiver ocorrido, confirmar ID, SKU DG, preço R$ 39,90, estoque 10, imagens, status e CTA. Se o anúncio ainda não estiver no upstream, registrar exatamente que a pendência é a sincronização existente, sem criar produto manual.
