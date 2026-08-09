# Distrito Geek — Especificação de design e arquitetura

Data: 2026-08-08

## Objetivo

Criar e publicar no Netlify um catálogo independente da Distrito Geek, seguindo o mockup fornecido. O site não terá relação técnica ou de autenticação com o FlowOps. O cliente consulta os produtos no domínio da Distrito Geek e conclui a compra no anúncio original do Mercado Livre, Shopee ou outro marketplace.

## Escopo público

- Página inicial com cabeçalho, hero, benefícios, destaques, marketplaces, categorias e rodapé no visual escuro/amarelo do mockup.
- Catálogo por categoria com busca, filtros, ordenação e paginação.
- Página própria para cada produto, com título, preço, descrição, atributos, disponibilidade e origem do anúncio.
- Galeria com miniaturas verticais à esquerda, imagem principal e zoom que acompanha o ponteiro.
- Botão de compra com identidade do marketplace e redirecionamento seguro para o anúncio correspondente.
- Páginas de perguntas frequentes e contato.
- Layout responsivo, navegação por teclado, contraste adequado, estados de carregamento, vazio e erro.
- Sem carrinho, checkout ou conta de consumidor nesta primeira versão.

## Painel administrativo

- Área `/admin` separada e exclusiva da Distrito Geek.
- Login por e-mail e senha, sessão em cookie `HttpOnly`, `Secure` e `SameSite=Strict`.
- Senha armazenada apenas como hash; segredo de sessão e credenciais mantidos nas variáveis protegidas do Netlify.
- Cadastro, edição, publicação, pausa e exclusão lógica de produtos.
- Cadastro de título, descrição, preço, estoque, categoria, atributos, imagens, marketplace, ID externo e URL de compra.
- Importação em lote de CSV e XLS, com pré-visualização, validação por linha, relatório de erros e confirmação antes de gravar.
- Tentativa de enriquecimento dos IDs do Mercado Livre com dados públicos do anúncio. Campos não encontrados permanecem destacados para correção manual.
- Importação inicial dos 38 anúncios ativos da planilha, excluindo os dois registros `Qa Codex` e mantendo o anúncio pausado fora da publicação.
- Tela simples de indicadores: publicados, rascunhos, pausados, incompletos e erros da última importação.

## Arquitetura

- Aplicação web responsiva em React com TypeScript e Vite.
- Netlify Functions para autenticação, catálogo, importação e operações administrativas.
- Netlify Blobs para persistência do catálogo e das configurações do site.
- Imagens mantidas por URL de origem quando confiável; upload administrativo disponível para substituir imagens ausentes ou instáveis.
- Conteúdo público servido por endpoints somente de leitura, sem expor dados administrativos ou segredos.
- Validação no cliente para retorno imediato e repetida no servidor como fonte de verdade.

## Modelo de dados

Cada produto terá identificador interno, slug, título, descrição, preço, moeda, estoque, status, categoria, imagens, atributos, destaque, origem e datas de criação/alteração. Cada origem contém marketplace, ID externo e URL validada por protocolo e domínio permitido. Um produto poderá ter mais de uma origem; a página mostrará um botão para cada anúncio disponível.

## Segurança e integridade

- Proteção contra sessão forjada por assinatura criptográfica e expiração curta.
- Limitação de tentativas de login e mensagens que não revelem se o e-mail existe.
- Funções administrativas recusam requisições sem sessão válida.
- Sanitização dos campos importados e nenhum HTML arbitrário renderizado.
- URLs externas validadas e abertas com proteção contra acesso à janela de origem.
- Atualizações usam versão do registro para evitar sobrescrita silenciosa.
- Logs administrativos não armazenam senha, cookie ou segredo.

## Experiência visual

O resultado seguirá a composição do mockup: fundo preto-azulado, superfícies discretamente elevadas, bordas finas, tipografia clara e amarelo como cor principal de ação. Roxo será usado apenas como apoio pontual, não como elemento dominante. No celular, filtros viram painel recolhível e a galeria mantém miniaturas navegáveis sem reduzir a área útil da imagem.

## Tratamento dos dados fornecidos

- `anuncios_1783989281192.csv`: fonte inicial de anúncios e preços.
- `flowops-stock-2026-07-04.xls`: contém somente um resumo de estoque e não será tratado como catálogo principal.
- `modelo-importacao-marketplace (2).csv`: usado como referência de formato, pois contém apenas exemplo fictício.
- Produtos sem imagem, descrição, categoria ou URL válida entram como rascunho/incompleto e não serão publicados automaticamente.

## Testes e aceite

- Testes unitários para normalização das planilhas, validação de URLs, autenticação e regras de publicação.
- Testes de integração das Functions e persistência.
- Testes ponta a ponta de login, importação, edição, publicação, filtros, galeria/zoom e redirecionamento.
- Comparação visual com o mockup em desktop e celular.
- Verificação final no endereço de produção do Netlify, inclusive navegação sem autenticação e isolamento do painel.

## Publicação

O site será criado como um novo projeto Netlify, sem reutilizar o projeto do FlowOps. O primeiro deploy poderá usar o subdomínio gerado pelo Netlify. A ligação do domínio próprio será feita somente quando o domínio e o DNS corretos forem confirmados, evitando interferir em outro serviço.

## Fora do escopo inicial

- Sincronização autenticada e contínua com APIs privadas dos marketplaces.
- Checkout próprio, pagamentos, pedidos, frete e conta de consumidor.
- Integração com FlowOps ou compartilhamento de usuários entre projetos.
