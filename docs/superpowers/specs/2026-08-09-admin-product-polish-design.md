# Admin Analytics and Product Experience Design

## Objetivo

Corrigir o diagnóstico CSP do GTM, tornar o painel analítico mais útil para aquisição, SEO e conversão, e melhorar a abertura e apresentação das páginas de produto sem romper a sincronização existente.

## Analytics

A aba Análises será dividida em Saúde, Aquisição, Comportamento, SEO e Conversão. Origem/mídia e participação percentual virão do GA4. Cliques por produto serão agrupados pelo caminho da página onde o evento ocorreu, evitando dependência de dimensões personalizadas. Search Console terá agregação por consulta e página, CTR, posição média e comparação com o período anterior.

## Produto

Toda mudança de rota volta ao topo. Descrições de marketplace serão convertidas em blocos seguros de parágrafos e listas, sem aceitar HTML externo. Imagens editoriais do corpo serão armazenadas como URLs aprovadas em `descriptionImages`, separadas das imagens sincronizadas da galeria e editáveis na curadoria administrativa.

## Segurança

A CSP incluirá somente a origem adicional necessária do GTM em `img-src`. URLs de imagens devem usar HTTPS ou caminhos locais. Credenciais continuam exclusivamente na Netlify.

## GitHub

Após testes e deploy, o histórico será enviado para um novo repositório privado `FrankSilva01/distrito-geek-site`, preservando os arquivos temporários não rastreados fora do commit.
