# Distrito Geek — catálogo comercial e famílias

## Objetivo

Evoluir a vitrine para uma central comercial orientada a dados reais, adicionando famílias editoriais, relações entre produtos, operação administrativa e descoberta comercial sem recriar catálogo, Radar, providers ou SEO existentes.

## Restrições invariantes

- URLs, slugs, titles, descriptions, H1/H2, canonicals, breadcrumbs, schemas, sitemap, robots, redirects e internal linking existentes são ativos preservados.
- Produtos não são duplicados. Família e relação referenciam IDs existentes.
- Família nunca é inferida/publicada automaticamente; a associação é editorial e confirmada no Admin.
- Cross-sell mostra apenas produtos públicos, válidos e distintos do produto atual.
- Nenhum desconto, review, disponibilidade ou atributo será inventado.
- Radar, providers, SKU DG e índice leve de guias permanecem intactos.
- TikTok usa exclusivamente listings reais. A URL da loja não será inventada enquanto não for fornecida.
- E-mail público: `franklin@distritogeek.com.br`. WhatsApp: `+55 11 93300-8549`, link `https://wa.me/5511933008549`.

## Arquitetura

### Catálogo

Estender o override editorial já persistido no Blob `storefront-editorial-overrides` com `familyId`, `relatedProducts`, `homePriority` e galeria editorial. Famílias vivem em registro próprio no mesmo store, contendo id, nome, slug, descrição curta, imagem opcional, ordem e publicação. Relações são direcionais e tipadas: `combina-com`, `compre-junto`, `complete-o-encontro`, `alternativa` e `mesma-familia`.

### Admin

Reaproveitar `CatalogManager`, seus filtros e drawer. Adicionar gestão compacta de famílias/relacionados, cards executivos derivados do catálogo, fila determinística de ações, matriz conteúdo×catálogo e comparação multicanal. Nenhuma tela calcula score geral.

### Storefront

ProductPage recebe módulos compactos de família, conteúdo do produto e cross-sell. A Home usa somente categorias, kits, famílias, novidades e acessórios com produtos reais. `createdAt` define novidade. Se uma nova landing não tiver produtos/conteúdo suficientes, ela não será criada nem indexada.

### Busca e filtros

Busca continua local e determinística, com aliases explícitos. Filtros só usam campos confiáveis e associações editoriais confirmadas.

### SEO

Antes/depois será comparado pela suíte existente sobre todas as URLs indexáveis. Páginas existentes não terão metadata reescrita. Novas páginas comerciais só entram com intenção única, conteúdo real, canonical, metadata, breadcrumb, links internos e sitemap; parâmetros e filtros continuam `noindex`.

## Falhas e degradação

- Família removida ou não publicada não quebra produto; apenas deixa de aparecer publicamente.
- Relação para produto oculto/inativo é ignorada.
- Canal sem listing real aparece como pendente no Admin e não gera CTA público.
- Falha upstream preserva o last-known-good existente.

## Validação

- TDD por módulo puro e componente.
- Typecheck, testes, build e `git diff --check` após cada bloco.
- Regressão final de canonical, robots, sitemap, metadata, breadcrumbs, structured data, links, 404/redirects e produtos ocultos.
- Comparação de bundles antes/depois; público, Admin e guias devem continuar lazy conforme estado atual.

