# SEO e Analytics — ativação

O código da Distrito Geek usa o Google Tag Manager como carregador único. Nenhuma tag é carregada antes do consentimento do visitante.

## 1. Search Console e DNS

No DNS da Hostinger, adicione um registro `TXT` no domínio raiz (`@`) com o valor fornecido pelo Search Console. Não altere nem remova registros MX, SPF, DKIM ou DMARC. Depois aguarde a propagação e clique em **Verificar** no Search Console.

O HTML também contém a verificação por meta tag como método complementar.

## 2. Google Tag Manager

O site usa o contêiner `GTM-KLJMDZ25`, configurado na Netlify pela variável pública `VITE_GTM_ID`.

No GTM:

1. Crie uma tag **Google tag** com o ID `G-MH9W3NFF5L`.
2. Acione em todas as páginas após o evento de consentimento do site.
3. Crie uma tag **HTML personalizado** com o snippet do Clarity e o projeto `xziz3wcv43`.
4. Acione sob a mesma condição de consentimento.
5. Crie gatilhos de evento personalizado para `view_product`, `view_category`, `search_product`, `filter_catalog`, `click_mercado_livre` e `click_shopee`.
6. Use **Visualizar**, valide no Tag Assistant e publique o contêiner.

Não instale GA4 ou Clarity diretamente no HTML: isso duplicaria pageviews e contornaria a escolha de privacidade.

## 3. Relatório GA4 no admin

Ative a Google Analytics Data API, crie uma conta de serviço somente leitura e conceda a ela o papel **Visualizador** na propriedade GA4. Configure na Netlify, apenas para Functions:

- `GA4_PROPERTY_ID`: ID numérico da propriedade, sem o prefixo `properties/`.
- `GA4_CLIENT_EMAIL`: e-mail da conta de serviço.
- `GA4_PRIVATE_KEY`: chave privada completa da conta de serviço.

Esses valores nunca devem usar o prefixo `VITE_` nem aparecer no frontend. Após novo deploy, o card **Aquisição nos últimos 28 dias** do admin exibirá usuários, sessões e canais.

## 4. Validação

- Aceite Analytics e confira o contêiner no Tag Assistant.
- Recuse Analytics e confirme que não há requisições para GTM, GA4 ou Clarity.
- Valide eventos no DebugView do GA4.
- Envie `https://distritogeek.com.br/sitemap.xml` ao Search Console.
- Confira URLs no teste de resultados avançados e no inspetor de URL do Search Console.
