# Descrição rica de produto — design

## Objetivo

Transformar descrições textuais sincronizadas dos marketplaces em uma página escaneável, visual e comercial, preservando integralmente o conteúdo real.

## Decisão

O parser reconhecerá cinco blocos: título de seção, parágrafo, lista, grade de benefícios e observação. Títulos curtos em caixa alta iniciam uma seção; sequências de linhas curtas sob seções como Diferenciais, Compatibilidade, Características e Conteúdo tornam-se uma grade de benefícios. Listas explícitas continuam como listas destacadas.

## Apresentação

- Títulos recebem marcador amarelo e hierarquia própria.
- Benefícios aparecem em cards compactos com ícone neutro de confirmação.
- Parágrafos permanecem em largura confortável e com espaçamento editorial.
- Imagens editoriais já cadastradas continuam intercaladas após o conteúdo.
- Uma faixa de confiança usa somente garantias universais e verificáveis: compra no marketplace, preço sincronizado e anúncio oficial.
- Em descrições extensas, um CTA final repete os links reais e ativos do marketplace.

## Restrições

- Não inventar benefícios nem modificar texto sincronizado.
- Não interpretar HTML externo.
- Não duplicar preço, estoque ou permalink.
- Manter tema claro/escuro, acessibilidade e responsividade.

## Validação

Testes unitários cobrem títulos, grades, listas, parágrafos e ausência de falsos títulos. Testes de interface verificam a faixa de confiança e CTA. A entrega exige suíte completa, typecheck, build e validação da produção.
