# Rich Product Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renderizar descrições reais de marketplace com hierarquia visual, benefícios, confiança e CTA contextual.

**Architecture:** Estender o parser puro em `src/domain/product-description.ts` e manter a apresentação em um componente dedicado. A página de produto fornece apenas os dados reais e links ativos já normalizados.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Netlify.

## Global Constraints

- Não inventar conteúdo, preço, estoque ou links.
- Não interpretar HTML externo.
- Preservar integração de marketplace e curadoria existentes.
- Validar temas, mobile, testes, typecheck e build.

---

### Task 1: Parser semântico

**Files:**
- Modify: `src/domain/product-description.ts`
- Test: `src/domain/product-description.test.ts`

**Interfaces:**
- Produces: `formatProductDescription(value: string): DescriptionBlock[]`
- Produces blocks: `heading`, `paragraph`, `list`, `featureGrid`

- [ ] Escrever casos falhos para títulos em caixa alta e sequências de benefícios.
- [ ] Executar o teste focado e confirmar falha.
- [ ] Implementar agrupamento semântico sem alterar o texto.
- [ ] Executar o teste focado e confirmar aprovação.

### Task 2: Apresentação rica e conversão

**Files:**
- Create: `src/components/ProductDescription.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/styles/product-description.css`
- Test: `src/app/app-flow.test.tsx`

**Interfaces:**
- Consumes: `DescriptionBlock[]`, título do produto e listings ativos.
- Produces: conteúdo semântico, faixa de confiança e CTA final.

- [ ] Escrever teste de interface para títulos, benefícios e CTA.
- [ ] Executar e confirmar falha.
- [ ] Implementar componente e estilos responsivos.
- [ ] Executar testes de interface e confirmar aprovação.

### Task 3: Entrega

- [ ] Executar suíte completa, typecheck e build.
- [ ] Revisar diff e versionar apenas arquivos da rodada.
- [ ] Enviar ao GitHub, publicar na Netlify e validar produção.
