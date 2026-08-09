# Analytics Health and Clarity Design

## Objetivo

Adicionar ao painel administrativo métricas do Microsoft Clarity, saúde independente de GA4, Search Console, GTM e Clarity e os eventos recentes enviados pelo GTM e recebidos pelo GA4.

## Arquitetura

O backend Netlify continuará sendo o único ponto com acesso às credenciais. O relatório de aquisição será ampliado com uma consulta GA4 Realtime e uma consulta à API Data Export do Clarity. Cada provedor retorna estado próprio e falhas parciais nunca bloqueiam os demais.

O GTM será validado pela presença do identificador configurado no deploy e pela recepção recente de eventos no GA4. Isso evita representar o GTM como banco de dados, função que ele não possui.

## Interface

A aba Análises terá uma seção Saúde das integrações com quatro cartões, uma tabela Últimos eventos e uma seção Comportamento no Clarity. Estados possíveis: ativo, aguardando dados, configuração pendente e erro temporário.

## Segurança e limites

`CLARITY_API_TOKEN` ficará apenas nas variáveis secretas da Netlify. A API do Clarity será consultada no máximo dentro de seu limite oficial, com cache do lado servidor e período de 1 a 3 dias. Nenhum token será retornado ao navegador ou escrito em logs.

## Validação

Testes cobrirão normalização do Clarity, isolamento de falhas, saúde das integrações, eventos Realtime e renderização administrativa. A entrega exige testes completos, typecheck, build e deploy de produção.
