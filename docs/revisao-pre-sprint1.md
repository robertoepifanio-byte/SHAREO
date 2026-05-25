# Revisão Pré-Sprint 1 — Relatório Consolidado

**Data**: 25/05/2026  
**Metodologia**: 7 subagentes revisando em paralelo (Arquiteto, Segurança, SEO, QA, DevOps, Product Owner, Designer)  
**Status**: Fase 1 concluída — Fase 2 (checklist Sprint 0) em andamento

---

## 🔴 BLOQUEADORES — Impedem o início do Sprint 1

### B1 — Conflito RLS × NextAuth.js v5 *(Arquiteto + Segurança)*
**Impacto**: F09 (chat) e todos os dados protegidos por RLS não funcionarão.  
**Causa**: ADR-003 usa `auth.uid()` do Supabase em políticas RLS, mas a autenticação é NextAuth.js v5 com JWT próprio — `auth.uid()` retorna `null` em todas as políticas.  
**Ação**: Criar ADR-008 com estratégia de resolução (service role + validação no servidor, ou migrar auth para Supabase Auth).

### B2 — Contraste WCAG AA reprovado no botão laranja *(Designer)*
**Impacto**: Todo componente Button/CTA violará WCAG 2.1 AA desde o primeiro commit.  
**Causa**: `brand.DEFAULT: #F97316` sobre branco = 2,94:1 (mínimo: 4,5:1). O próprio protótipo já corrigiu com `#C05800` (4,47:1).  
**Ação**: Atualizar `tailwind.config.ts` — `brand.cta: "#C05800"`, `brand.link: "#9A4700"`.

### B3 — Versão PostgreSQL divergente no CI *(DevOps)*
**Impacto**: Migrations com funções PG15/PG16 podem ter comportamento diferente entre CI e Supabase.  
**Causa**: CI usa `postgis/postgis:16-3.4`; Supabase usa PostgreSQL 15.  
**Ação**: Trocar para `postgis/postgis:15-3.4` no `ci.yml` antes do primeiro push.

### B4 — `jest.setup.ts` incompleto *(QA)*
**Impacto**: Testes de integração (MSW) e acessibilidade (jest-axe) não funcionarão desde o primeiro arquivo de teste.  
**Faltam**: `server.listen/resetHandlers/close` do MSW; `expect.extend(toHaveNoViolations)` do jest-axe; `afterEach/afterAll`.  
**Ação**: Completar `jest.setup.ts` + criar `src/mocks/server.ts` e `handlers.ts`.

### B5 — Playwright ausente no CI *(QA + DevOps)*
**Impacto**: Fluxos críticos F08 (aluguel) e F09 (chat) sem cobertura E2E automática.  
**Ação**: Criar `playwright.config.ts` + job `e2e` no `ci.yml`.

### B6 — Threshold de cobertura 70% bloqueará o primeiro PR *(QA)*
**Causa**: Com codebase zero, nenhum arquivo terá cobertura acima de 0% no primeiro commit.  
**Ação**: Reduzir temporariamente para 0% com issue de dívida técnica para subir progressivamente.

### B7 — GitHub Environments não criados *(DevOps)*
**Impacto**: Jobs com `environment: staging` e `environment: production` ficam bloqueados indefinidamente.  
**Ação**: Criar environments no GitHub → Settings → Environments antes do primeiro push para main.

### B8 — Supabase não provisionado *(DevOps)*
**Impacto**: CI falha em `prisma migrate deploy`; staging e produção indisponíveis.  
**Ação**: Criar projetos Supabase staging e production; ativar `CREATE EXTENSION postgis` em ambos.

---

## 🟠 GAPS DE SEGURANÇA — Alta prioridade

### S1 — CSP com `unsafe-inline` em `script-src` *(Segurança + SEO)*
**Impacto**: Anula toda proteção contra XSS em produção. Também bloqueia Google Analytics (`connect-src` sem domínios do GA).  
**Ação**: Remover `unsafe-inline` de `script-src` em produção (usar nonces via `next/headers`). Adicionar `https://*.google-analytics.com https://www.googletagmanager.com` ao `connect-src`.

### S2 — `deletedAt` ausente em `Booking` e `Message` *(Arquiteto + Segurança)*
**Impacto**: LGPD — soft delete obrigatório em dados transacionais e mensagens privadas.  
**Ação**: Adicionar `deletedAt DateTime?` a ambos os modelos no `schema.prisma` + migration.

### S3 — Rate limiting não definido *(Segurança + ADR-001)*
**Impacto**: Endpoints de autenticação, validação CPF/CNPJ e upload sem proteção contra força bruta.  
**Ação**: Decidir solução (Upstash Rate Limit, middleware Next.js) e documentar em ADR-001 (item em aberto).

---

## 🟠 GAPS DO PRD — Alta prioridade

### P1 — Features sem critérios de aceite *(Product Owner)*
**Afetadas**: F02 (Perfil), F06 (Filtros), F07 (Detalhe do item), F11 (Favoritos), F12 (Dashboard locatário), F13 (Admin), F14 (Notificações).  
**Ação**: PO precisa escrever critérios Gherkin para cada uma antes do Planning do Sprint 1.

### P2 — Features implícitas obrigatórias ausentes do PRD *(Product Owner)*
As seguintes features não têm Feature ID mas são pré-requisitos do MVP:

| Feature implícita | Por que é obrigatória |
|---|---|
| Recuperação de senha | Qualquer usuário que esqueça a senha fica bloqueado |
| Verificação de e-mail | Mencionada no fluxo 4.1 sem feature ID ou critérios |
| Exclusão de conta (LGPD) | Direito ao esquecimento — PRD alega "conformidade total" |
| Calendário de disponibilidade | Sem ela, múltiplas solicitações simultâneas para o mesmo período não têm tratamento |
| Status do aluguel visível ao locatário | F12 lista "minhas locações" mas não define como o locatário acompanha o estado |

### P3 — Máquina de estados incompleta *(Product Owner)*
**Indefinições críticas**:
- SLA para PENDING expirar automaticamente → CANCELLED (quantas horas?)
- Transição CONFIRMED → ACTIVE: automática por data ou manual pelo locador?
- Solicitações simultâneas no mesmo item: aceitar múltiplos PENDING ou bloquear?
- Caução: campo no anúncio sem processo de cobrança/devolução definido (sem pagamento integrado no MVP)

---

## 🟡 GAPS DE DESIGN — Média prioridade

### D1 — Biblioteca base de componentes sem decisão *(Designer)*
**Impacto**: Cada desenvolvedor implementa acessibilidade do zero — custo alto, resultado inconsistente.  
**Opções**: shadcn/ui (recomendado — reduz ~60% do trabalho de a11y no Sprint 1), Radix UI puro, HeadlessUI, from scratch.  
**Ação**: Decisão necessária antes do primeiro Button ser implementado.

### D2 — Plugins Tailwind ausentes *(Designer)*
**Faltam**: `tailwindcss-animate` (animações Dialog/Sheet), `@tailwindcss/forms` (reset de inputs).  
**Ação**: Adicionar em `plugins:` no `tailwind.config.ts`.

### D3 — Tokens ausentes no Tailwind *(Designer)*
**Faltam**: `colors.disabled.{bg,text,border}`, `ringWidth.DEFAULT: "2px"`, `ringOffset.DEFAULT: "2px"`, token explícito `spacing.tap` alinhado a `minHeight.tap`.

---

## 🟡 GAPS DE INFRAESTRUTURA — Média prioridade

### I1 — Jobs ausentes no pipeline CI/CD *(DevOps)*
| Job ausente | Função |
|---|---|
| `audit` | `pnpm audit --audit-level=high` — detecta CVEs em dependências |
| `lighthouse-ci` | Mede LCP/CLS/INP contra metas do CLAUDE.md sobre preview URL |
| `e2e` | Playwright cobrindo fluxo de auth e criação de item |
| `.github/dependabot.yml` | Atualização automática de pnpm e GitHub Actions |

### I2 — Secrets não documentados *(DevOps)*
`RESEND_API_KEY` usado no `.env.example` mas ausente da lista de secrets no cabeçalho do `ci.yml`. `AUTH_URL` não injetado em nenhum job do CI.

---

## 🟡 GAPS DE SEO — Média prioridade

### E1 — Padrão de URL slug não formalizado *(SEO)*
Protótipo e agente SEO assumem `/alugar/{categoria}/{titulo}-em-{cidade}-{uf}` mas isso não está documentado em nenhum ADR ou config. Deve ser definido antes da primeira página de item.

### E2 — Sitemap.xml e robots.txt não planejados *(SEO)*
Essenciais para indexação desde o MVP. Devem ser criados via Next.js antes do primeiro deploy público.

---

## 📋 ADRs A CRIAR (Sprint 0)

| ADR | Tema | Urgência |
|---|---|---|
| ADR-005 | Estrutura de pastas e convenções de componentes | Alta |
| ADR-006 | Estratégia de renderização por tipo de página (SSG/SSR/ISR/CSR) | Alta |
| ADR-007 | Gestão de estado (React Query + Zustand vs apenas React Query) | Média |
| **ADR-008** | **RLS vs NextAuth.js — estratégia de autenticação para Supabase** | **Bloqueador** |
| ADR-009 | Upload de imagens (Supabase Storage, validação, otimização) | Média |

---

## ⚡ DECISÕES PENDENTES (PO + Arquiteto + Designer)

| Decisão | Responsável | Urgência |
|---|---|---|
| Biblioteca base (shadcn/ui vs Radix vs from scratch) | Arquiteto + Designer | Antes do Sprint 1 |
| Cor oficial CTA laranja (#F97316 vs #C05800) | Designer | Antes do Sprint 1 |
| SLA de resposta do locador (PENDING → timeout) | PO | Antes do Sprint 1 |
| Solicitações simultâneas no mesmo item | PO | Antes do Sprint 1 |
| Quem ativa ACTIVE (automático vs manual) | PO | Antes do Sprint 1 |
| PJ no MVP: aprovação manual por e-mail? | PO | Sprint 1 |
| Dark mode: descartar explicitamente ou planejar tokens | Designer | Sprint 1 |
| Rate limiting: Upstash vs middleware Next.js | Arquiteto + Segurança | Sprint 1 |

---

## 📦 CHECKLIST SPRINT 0 — Setup técnico antes do primeiro feature

### Infraestrutura
- [ ] Criar projetos Supabase staging e production
- [ ] Ativar `CREATE EXTENSION postgis` em ambos
- [ ] Criar environments `staging` e `production` no GitHub
- [ ] Configurar todos os secrets nos environments corretos (incluindo `RESEND_API_KEY`)
- [ ] Criar projeto Vercel e linkar com o repositório
- [ ] Criar projeto Sentry `shareo-web`

### Código
- [ ] Criar estrutura de pastas: `app/`, `components/`, `hooks/`, `lib/`, `utils/`
- [ ] Criar `package.json` com scripts: `dev`, `build`, `lint`, `type-check`, `test`, `test:e2e`
- [ ] Completar `jest.setup.ts` (MSW + jest-axe)
- [ ] Criar `src/mocks/server.ts` e `handlers.ts`
- [ ] Criar `playwright.config.ts`
- [ ] Instalar `eslint-plugin-jsx-a11y`
- [ ] Adicionar plugins ao `tailwind.config.ts` (tailwindcss-animate, @tailwindcss/forms)
- [ ] Corrigir contraste: `brand.cta: "#C05800"` no `tailwind.config.ts`
- [ ] Adicionar tokens ausentes: `disabled`, `ringWidth`, `ringOffset`

### Schema
- [ ] Adicionar `deletedAt DateTime?` a `Booking` e `Message` no `schema.prisma`
- [ ] Criar e rodar primeira migration: `prisma migrate dev --name init`

### CI/CD
- [ ] Corrigir `postgis/postgis:16-3.4` → `postgis/postgis:15-3.4` no `ci.yml`
- [ ] Adicionar job `e2e` com Playwright
- [ ] Adicionar job `audit` com `pnpm audit`
- [ ] Criar `.github/dependabot.yml`
- [ ] Reduzir threshold de cobertura temporariamente

### ADRs
- [ ] ADR-005: Estrutura de pastas
- [ ] ADR-006: Estratégia de renderização
- [ ] ADR-007: Gestão de estado
- [ ] **ADR-008: RLS vs NextAuth.js** ← bloqueador F09
- [ ] ADR-009: Upload de imagens

### PRD
- [ ] Escrever critérios de aceite para F02, F06, F07, F11, F12, F13, F14
- [ ] Criar features implícitas: recuperação de senha, verificação de e-mail, exclusão de conta (LGPD), calendário de disponibilidade
- [ ] Definir SLA de resposta do locador e tratamento de solicitações simultâneas

---

*Gerado automaticamente por revisão paralela de 7 subagentes em 25/05/2026.*
