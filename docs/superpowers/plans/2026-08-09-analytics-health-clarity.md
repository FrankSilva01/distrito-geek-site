# Analytics Health and Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Clarity, saúde das tags e eventos recentes ao painel de Análises.

**Architecture:** Ampliar a função analítica existente com adaptadores isolados para Clarity e GA4 Realtime. Entregar um único contrato de relatório que conserva dados disponíveis quando um provedor falha.

**Tech Stack:** React 19, TypeScript, Netlify Functions, GA4 Data API, Microsoft Clarity Data Export API, Vitest.

## Global Constraints

- Credenciais somente no backend.
- Não consultar GTM como fonte de eventos; usar GA4 Realtime.
- Não deixar uma integração indisponível bloquear as demais.
- Respeitar limite de 10 consultas diárias do Clarity.

---

### Task 1: Clarity e saúde do backend

**Files:**
- Create: `netlify/functions/_shared/clarity.ts`
- Modify: `netlify/functions/_shared/google-analytics.ts`
- Test: `src/server/analytics-health.test.ts`

**Interfaces:**
- Produces: `clarityInsights(period): Promise<ClarityResult>` e os campos `health`, `clarity`, `recentEvents` em `acquisitionReport`.

- [ ] Escrever testes falhando para normalização, configuração ausente e falha isolada.
- [ ] Executar os testes e confirmar falha pela ausência das interfaces.
- [ ] Implementar Clarity Data Export e GA4 Realtime com estados independentes.
- [ ] Executar os testes e confirmar aprovação.

### Task 2: Painel administrativo

**Files:**
- Modify: `src/admin/AdminPage.tsx`
- Modify: `src/styles/global.css`
- Test: `src/admin/admin-flow.test.tsx`

**Interfaces:**
- Consumes: `health`, `clarity`, `recentEvents` do relatório administrativo.

- [ ] Escrever teste falhando para os quatro cartões de saúde, eventos e Clarity.
- [ ] Executar o teste e confirmar que a interface ainda não existe.
- [ ] Implementar os componentes no padrão visual existente.
- [ ] Executar o teste e confirmar aprovação.

### Task 3: Configuração e entrega

**Files:**
- Modify: `netlify.toml` somente se a política de segurança exigir nova origem.

**Interfaces:**
- Consumes: `CLARITY_API_TOKEN` como segredo Netlify.

- [ ] Criar ou localizar o token Data Export no projeto Clarity existente e gravá-lo como segredo Netlify.
- [ ] Executar suíte completa, typecheck e build.
- [ ] Fazer deploy de produção sem cache de Functions.
- [ ] Validar a resposta autenticada e a renderização da aba Análises.
- [ ] Commitar somente arquivos pertencentes à entrega.
