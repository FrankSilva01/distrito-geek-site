# Kit 10 Árvores e correção do CTA dos Orcs

## Escopo

Cadastrar um único anúncio real no Mercado Livre e corrigir a inconsistência já reproduzida no CTA do produto legado `DG-MIN-000038`, sem alterar SEO, arquitetura do catálogo, providers ou regras de segurança.

## Anúncio Mercado Livre

- Título: `Kit 10 Árvores RPG Cenário 3D Floresta Dungeon Wargame`.
- Preço: R$ 39,90.
- Estoque: 10 unidades.
- Modalidade: Premium.
- Prazo de disponibilidade: 5 dias.
- Promoção: ativar quando a interface do anúncio disponibilizar a opção.
- Conteúdo: 10 árvores, com 9 modelos diferentes e 1 modelo repetido, em PLA sem pintura.
- Medidas aproximadas por peça, conforme os arquivos fornecidos: largura de 17,48 a 36,14 mm, profundidade de 17,71 a 34,16 mm e altura de 31,73 a 39,30 mm. A descrição usará a faixa em linguagem natural e deixará claro que o tamanho varia por modelo.
- Imagens: usar como principal a fotografia mais limpa e frontal do conjunto físico; usar as demais fotografias reais como complementares. Capturas do fatiador servem apenas para validar dimensões e não serão publicadas como imagens comerciais.
- Categoria e atributos: selecionar a categoria mais específica oferecida pelo Mercado Livre para cenário/terreno de RPG e preencher apenas atributos sustentados pelos dados fornecidos.

## Integração com Distrito Geek

Após a publicação e sincronização existente, validar que o produto aparece no Admin com preço, imagens, estoque, status e permalink reais. Não será criada cópia manual paralela no catálogo.

## CTA do produto Orc

A causa confirmada é o permalink legado `http://produto.mercadolivre.com.br/...` recebido pelo catálogo. A política do site aceita exclusivamente HTTPS, então o produto está marcado para publicação, mas é corretamente excluído da vitrine e classificado como `SEM CTA`.

A correção será feita na fronteira de importação: URLs HTTP de domínios oficiais e permitidos do Mercado Livre serão normalizadas para HTTPS antes da criação de `listings`. Outros hosts e protocolos continuarão rejeitados. O relatório comercial continuará usando a mesma validação central.

## Validação

- Teste de regressão para normalização do permalink oficial HTTP para HTTPS.
- Testes existentes de rejeição a protocolos e hosts inseguros.
- Typecheck, suíte completa, build e `git diff --check`.
- Verificação do CTA do Orc no Admin e na página pública.
- Verificação do anúncio recém-publicado e, após sincronização, do respectivo produto no Distrito Geek.

## Fora de escopo

- Alterações em Home, guias, Radar, SEO, sitemap, schemas ou providers.
- Geração de avaliações, vendas, promoções ou atributos não comprovados.
- Mudança na política que exige HTTPS para links de compra.
