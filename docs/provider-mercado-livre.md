# Provider Mercado Livre — coleta de evidências do Radar

Conecta o **search público do Mercado Livre** ao Radar de Oportunidades. O usuário pesquisa um
termo, revê os resultados e importa os que quiser como evidências de uma **nova sessão de pesquisa**.
O motor de decisão **não foi alterado**.

## Fluxo

1. Aba **Evidências** de uma oportunidade → campo **Buscar no Mercado Livre** → botão.
2. UI chama `GET /api/admin-research-mercadolivre?q=<termo>&limit=<n>` (admin-only, `no-store`).
3. O endpoint (server) resolve o token, consulta `GET /sites/MLB/search`, normaliza e devolve
   `results: EvidenceDraft[]` + `metadata`. **Nada é persistido aqui.**
4. Tela de revisão: seleção (todos/nenhum/individual), edição de comparabilidade/quantidade/
   material/escala/observação, link para o anúncio.
5. **Importar selecionados** → cria uma **nova `ResearchSession`** (data, termo, fonte
   `mercado-livre`, evidências) no modelo da oportunidade → motor recalcula → usuário **Salva**.

## Autenticação (server-only)

O search do ML exige `Authorization: Bearer <access_token>`. O token vive **só no servidor**.
Ordem de resolução em `netlify/functions/_shared/mercadolivre.ts`:

1. Cache em memória (instância morna) se ainda válido.
2. Token persistido em Netlify Blobs (`ml-oauth`) se ainda válido.
3. **Refresh OAuth** (`POST /oauth/token`, `grant_type=refresh_token`) se houver
   `ML_CLIENT_ID` + `ML_CLIENT_SECRET` + refresh token — rotaciona e **persiste** o novo refresh
   token nos Blobs.
4. Token estático `ML_ACCESS_TOKEN` (curto, ~6 h — bom para teste/manual).

Em 401/403 o cache é invalidado para forçar novo refresh na próxima chamada.

### Setup manual inicial (uma vez)

1. Criar um aplicativo em `developers.mercadolivre.com.br` → obter **Client ID** e **Secret**.
2. Autorizar o app uma vez (fluxo OAuth do ML) para obter o **refresh token** inicial.
3. Configurar no Netlify as variáveis de ambiente abaixo. Enquanto não configurar, o Radar segue
   **100% manual** e a UI mostra “Mercado Livre não configurado.”.

## Variáveis de ambiente (Netlify)

| Var | Obrigatória | Uso |
|---|---|---|
| `ML_CLIENT_ID` | para refresh | App ML (OAuth) |
| `ML_CLIENT_SECRET` | para refresh | App ML (OAuth) — **nunca no cliente** |
| `ML_REFRESH_TOKEN` | para refresh | Refresh token inicial (rotaciona depois nos Blobs) |
| `ML_ACCESS_TOKEN` | alternativa | Token estático curto (teste/manual) |

Basta **`ML_ACCESS_TOKEN`** OU o trio **`ML_CLIENT_ID`+`ML_CLIENT_SECRET`+`ML_REFRESH_TOKEN`**.

## Endpoint usado

`GET https://api.mercadolibre.com/sites/MLB/search?q=<termo>&limit=<1..50>` (MLB = Brasil).
Timeout server-side de 8 s (`AbortController`). Sem retry infinito.

## Campos mapeados (só quando disponíveis)

| Evidence | Origem ML | Observação |
|---|---|---|
| `url` | `permalink` | |
| `title` | `title` | não editar sem necessidade |
| `price` | `price` | ausente → `unknown` |
| `sold` | `sold_quantity` | **referencial** (aprox.), entra com `note`; ausente → `unknown` |
| `reviews` | — | search não retorna → `unknown` (sem N+1 por item) |
| `kitQuantity` | atributo estruturado (`UNITS_PER_PACKAGE`…) | senão `unknown` (título **não** é inferido) |
| `scale` | atributo `SCALE`/`ESCALA` | senão `unknown` |
| `material` | atributo `MATERIAL` | senão `unknown` |
| `comparability` | — | entra **`parcial`**; provider **não** decide `comparavel` |
| `note` | id ML + vendedor + categoria + aviso de sold referencial | rastreabilidade |

Exibição na revisão: imagem (`thumbnail`), vendedor (`seller.nickname`/id), categoria (`category_id`).

## `sold_quantity` — ponto crítico

O Mercado Livre expõe `sold_quantity` como **referência aproximada**, não número exato garantido.
Por isso: valor presente → `sold = número` **+** `note`
“Quantidade vendida informada pelo Mercado Livre como referência aproximada.”
Ausente → `sold = 'unknown'`. **Nunca 0 por ausência.**

## Limitações

- `sold`/`available` são referenciais (privacidade do ML).
- Avaliações não vêm no search (ficam `unknown`).
- Sem paginação na UI V1 (default 24, máx. 50 por busca).
- Comparabilidade é **decisão humana** — importados entram `parcial` e só contam no preço quando
  promovidos a `comparavel` (o motor só conta `comparavel`).

## Rate limit e erros

`429` → mensagem “aguarde e tente de novo”, **sem retry infinito**. `401/403` → autorização
inválida (invalida cache). `5xx`/rede → indisponível. `timeout` → demora. `payload inválido` →
resposta inesperada. Todos falham **graciosamente**, sem quebrar o Radar. Logs técnicos podem
registrar provider/status/duração/query/quantidade — **nunca** o token.

## O que NÃO faz

Shopee, TikTok, Google, scraping, crawling, IA, inferência de título, automação de
comparabilidade, alteração do motor, autoaprovação de oportunidades. Cada coleta é um snapshot
datado (as sessões de pesquisa já são o histórico).
