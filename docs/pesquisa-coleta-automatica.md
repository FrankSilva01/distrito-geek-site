# Prova de viabilidade — coleta automática de evidências do Radar

> Rodada de **investigação** (agosto/2026). Objetivo: descobrir, por fonte, se dá para
> automatizar a geração de `Evidence[]` para o Radar de Oportunidades **por API oficial**,
> sem scraping frágil e sem integração sem comprovação. **Nada foi conectado à produção.**
> O motor do Radar (`src/domain/opportunity.ts`) e o schema de `Evidence` **não foram alterados**.

## TL;DR

- **Viáveis por API oficial:** Mercado Livre e Shopee (Afiliados).
- **Recomendado para a 1ª implementação:** **Mercado Livre** — menor barreira (só registrar um app
  OAuth, sem conta de vendedor), retorno estruturado (preço, título, permalink, imagem, seller,
  categoria, atributos). Ressalva: `sold_quantity` é **referencial** (aproximado).
- **Forte 2º candidato:** **Shopee Afiliados** (`productOfferV2`) — o mais rico (tem **vendas** e
  **avaliação**), mas exige **conta de afiliado aprovada**.
- **Continuam manuais:** **TikTok Shop** (não há API pública de concorrência), **Google**
  (Custom Search JSON API fechado para novos clientes) e **lojas especializadas** (sem API padrão).
- **Andaime já preparado (inerte):** `src/research/market-research.ts` — contrato
  `MarketResearchProvider → Evidence[]`, normalizador `UNKNOWN≠0` e providers declarando
  capacidade; os automáticos lançam `NotImplementedError` até a rodada de conexão.

## 1. Tabela de viabilidade

| Fonte | Pesquisa pública de terceiros | Preço | Vendidos | Avaliações | Seller | API oficial | Auth | Confiabilidade | Viável p/ V1? |
|---|---|---|---|---|---|---|---|---|---|
| **Mercado Livre** | Sim (`/sites/MLB/search`) | Sim (exato) | **Referencial** (aprox.) | Não (no search) | Sim (id) | Sim | OAuth2 (app; sem conta vendedor) | Alta | **SIM (1º)** |
| **Shopee (Afiliados)** | Sim (`productOfferV2`) | Sim (min/max) | **Sim** (`sales`) | **Sim** (`ratingStar`) | Sim (shop) | Sim | AppId+Secret, assinatura SHA256; **conta de afiliado aprovada** | Alta | **SIM (2º)** |
| **TikTok Shop** | Não (APIs são da própria loja) | — | — | — | — | Só seller/shop | OAuth de loja | — | **NÃO** |
| **Google / descoberta** | Parcial (só URLs) | Não | Não | Não | Não | Custom Search JSON **fechado p/ novos clientes** | API key | Baixa (deprecando) | **NÃO** |
| **Lojas especializadas** | Não padronizado | varia | Não | varia | — | Nenhuma padrão | — | Baixa (exigiria scraping) | **NÃO** |

## 2. Mercado Livre

- **Endpoint público de busca:** `GET https://api.mercadolibre.com/sites/MLB/search?q=<termo>`
  (MLB = Brasil). **Hoje exige** `Authorization: Bearer <access_token>` — a chamada anônima
  foi descontinuada. O token sai de um **app registrado** (OAuth2); **não** precisa de conta de
  vendedor para o recurso de busca.
- **Campos úteis por item:** `price`, `permalink` (URL), `title`, `thumbnail`/`pictures`,
  `seller.id`, `condition`, `category_id`, `attributes`.
- **`sold_quantity` e `available_quantity`:** nos recursos públicos são **referenciais**
  (valores aproximados/bucketizados), não o número exato — é medida de privacidade do ML.
  Para o Radar isso se traduz em: `sold` = número referencial **com `note` marcando que é
  aproximado**; se ausente, `sold = 'unknown'` (nunca 0).
- **Distinção importante:** API da **própria conta** (itens do seu seller, com dados exatos) ≠
  **busca/catálogo público** (itens de terceiros, com `sold`/`available` referenciais). Para
  inteligência de mercado usamos a segunda.
- **Limitações:** rate limits por app; `sold` aproximado; sem número de avaliações no payload de
  busca (avaliações vêm em recurso separado de reviews, avaliar em rodada futura).
- **Docs:** `developers.mercadolivre.com.br/en_us/items-and-searches`,
  `.../manage-your-applications` (registro do app / OAuth).

## 3. Shopee (Afiliados) — `productOfferV2`

- **Endpoint:** `POST https://open-api.affiliate.shopee.com.br/graphql` (GraphQL). Query
  `productOfferV2(keyword, shopId, itemId, ...)` **pesquisa produtos de vários vendedores**.
- **Campos:** `itemId`, `productName`, `productLink`, `offerLink`, `imageUrl`,
  `priceMin`/`priceMax`, `priceDiscountRate`, **`sales`** (vendas históricas), **`ratingStar`**,
  `commissionRate`, `shopId`, `shopName`, `shopType`.
- **Auth:** conta na **Shopee Affiliate Open Platform** (AppId + Secret), **assinatura SHA256**
  no header `Authorization`. Requer **aprovação como afiliado**.
- **Limitações:** rate limit (erro `10030`); preço vem como faixa (min/max); categoria por
  `productCatIds` (mapear); foco em itens elegíveis ao programa de afiliados.
- **Docs:** `affiliateshopee.com.br/documentacao`, explorer `open-api.affiliate.shopee.com.br/explorer/v2`.
- **Se algum dia deixar de ter busca pública adequada:** registrar
  **`PROVIDER AUTOMÁTICO DE MERCADO: NÃO VIÁVEL VIA API OFICIAL ATUAL`** e manter o manual.
  Hoje **é viável**.

## 4. TikTok Shop

- Só há **Seller API / Shop API / Affiliate *Seller* API** — todas **no escopo da própria loja**
  (produtos, pedidos, estoque, colaborações com criadores). **Não existe API pública oficial de
  pesquisa de concorrentes / market intelligence.**
- Ferramentas de "pesquisa de concorrente" no mercado são **third-party/scraping**, fora do
  oficial — **não recomendado** como padrão.
- **Veredito:** **NÃO VIÁVEL** por API oficial. Permanece **manual**.
- Não confundir *Affiliate Seller API* (sua loja) com inteligência de mercado (não existe oficial).

## 5. Google / descoberta

- **Custom Search JSON API:** **não está disponível para novos clientes**; clientes existentes têm
  até **1º/jan/2027** para migrar. Free tier era 100 consultas/dia. Para um projeto **novo**, é
  efetivamente **inviável** como integração oficial estável.
- **Programmable Search Engine** (widget) é gratuito, mas exibe anúncios e **não é uma JSON API**
  para extração estruturada.
- **Content API for Shopping** serve para **seus próprios** produtos, não para pesquisar terceiros.
- **Veredito:** usar Google, **no máximo**, para **descoberta manual de URLs/lojas** (colar no
  Radar). Não é fonte automática recomendada.

## 6. Arquitetura de providers

Contrato único, todos os providers desembocam em `Evidence[]` (schema atual, intacto):

```
MarketResearchProvider
  id: 'mercado-livre' | 'shopee-afiliados' | 'manual'
  availability: 'viable' | 'needs-approval' | 'not-viable'
  capabilities: { publicSearch, price, sold, reviews, seller, image, category, kitQuantity }
                 // cada campo: 'exact' | 'referential' | 'none'
  authNote: string
  search(query: MarketQuery): Promise<EvidenceDraft[]>   // draft = Evidence sem id
```

- **Normalização (`normalizeEvidence`)** aplica **UNKNOWN por ausência** (`toUnknownNumber`):
  só número finito real vira número; `null`/`undefined`/`NaN`/string viram `'unknown'` — **a
  ausência jamais vira 0**. `comparability` começa `'comparavel'` e é **revista por humano** (a
  máquina não decide comparabilidade). Valor referencial (ex.: `sold` do ML) entra como número
  **com `note`** dizendo que é aproximado.
- **Fluxo de conexão futura (por provider):** `search()` chama a API → mapeia cada item para
  `RawMarketRecord` → `normalizeEvidence(...)` → devolve `EvidenceDraft[]` → a UI do Radar cria
  uma **nova sessão de pesquisa** e adiciona os drafts (o usuário revisa comparabilidade e salva).
  O motor (`assessSession`) roda idêntico — **não muda**.

## 7. Estratégia de fallback

- **`ManualProvider` continua o padrão** e o piso de confiabilidade: cadastro manual, colar URL,
  import CSV. É o que o Radar V1 já faz pela UI.
- Nenhum provider de **scraping de HTML** é proposto como padrão. Se um dia for inevitável para
  uma fonte, seria opt-in explícito, isolado e com aviso de fragilidade — não nesta trilha.

## 8. Riscos

**Técnicos**
- ML: token OAuth expira/renova; rate limit por app; `sold` referencial exige rótulo honesto na UI.
- Shopee: assinatura SHA256 correta (fácil errar); aprovação de afiliado pode demorar; preço em faixa.
- Segredos (AppId/Secret/refresh token) **nunca no cliente** — só em Netlify Function/env, como o
  restante do backend.

**De confiabilidade / conformidade**
- Dados de marketplace mudam a cada consulta — cada coleta é um **snapshot datado** (o modelo de
  sessões já cobre isso).
- Uso "para inteligência de mercado" deve respeitar os **ToS** de cada API oficial; a Shopee expõe
  os dados **via programa de afiliados** (uso previsto), o ML via **busca pública** (itens ativos).
- Nada de compilar dado pessoal de vendedores além do que a API pública devolve.

## 9. Próximo passo (rodada dedicada de conexão)

1. **Mercado Livre primeiro:** registrar app, guardar credenciais em env do Netlify, implementar
   `mercadoLivreProvider.search()` (chamar `/sites/MLB/search`, mapear → `normalizeEvidence`,
   `sold` referencial com `note`), endpoint admin que devolve `EvidenceDraft[]`, botão na UI
   "Buscar no Mercado Livre" que abre uma nova sessão com os drafts para revisão humana.
2. **Shopee depois**, quando a conta de afiliado estiver aprovada.
3. Manter TikTok/Google/lojas no manual.

Tudo isso **sem tocar no motor de decisão** — ele já está pronto e é o que garante que a
inteligência do Radar continua determinística e auditável.
