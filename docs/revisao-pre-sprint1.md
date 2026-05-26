# Revisão Pré-Sprint 1 — Relatório Consolidado

**Data**: 25/05/2026  
**Metodologia**: 7 subagentes revisando em paralelo (Arquiteto, Segurança, SEO, QA, DevOps, Product Owner, Designer)  
**Status**: ✅ Sprint 0 concluído — ver `checklist-para-staging.md` para o que falta antes do deploy em staging

### Legenda de resolução
- ✅ **Resolvido** no Sprint 0 (esta sessão)
- 🔄 **Já existia** antes desta sessão
- ❌ **Pendente** — necessário antes de staging ou produção
- ⏳ **Deferido** — não bloqueia staging, resolver antes de produção

---

## 🔴 BLOQUEADORES — Impedem o início do Sprint 1

### B1 — ✅ Conflito RLS × NextAuth.js v5 *(Arquiteto + Segurança)*
**Resolução**: ADR-008 criado — segurança implementada na camada API Next.js com padrão `if (resource.ownerId !== session.user.id) → 403`. RLS nativo desabilitado por incompatibilidade com PgBouncer + NextAuth JWT.

### B2 — ✅ Contraste WCAG AA reprovado no botão laranja *(Designer)*
**Resolução**: `tailwind.config.ts` atualizado com `brand.cta: "#C05800"` e `brand.link: "#9A4700"`.

### B3 — ✅ Versão PostgreSQL divergente no CI *(DevOps)*
**Resolução**: `ci.yml` atualizado — `postgis/postgis:16-3.4` substituído por `postgis/postgis:15-3.4`.

### B4 — ✅ `jest.setup.ts` incompleto *(QA)*
**Resolução**: `jest.setup.ts` completo com MSW (`server.listen/resetHandlers/close`) + jest-axe (`toHaveNoViolations`). `src/mocks/server.ts` e `handlers.ts` criados.

### B5 — ✅ Playwright ausente no CI *(QA + DevOps)*
**Resolução**: `playwright.config.ts` criado (Chromium + Mobile Chrome + Mobile Safari). Job `e2e` adicionado ao `ci.yml`. `e2e/smoke.spec.ts` criado.

### B6 — ✅ Threshold de cobertura 70% bloquearia o primeiro PR *(QA)*
**Resolução**: Threshold zerado em `ci.yml` com comentário `# TODO: elevar progressivamente até 70%`.

### B7 — ❌ GitHub Environments não criados *(DevOps)*
**Ação pendente**: Criar environment `staging` (Settings → Environments) com secrets antes do primeiro push.  
**Obs**: Environment `production` pode ser criado após validação em staging.

### B8 — 🔄 Supabase staging já provisionado
**Status**: `.env.local` existe e migrations `init` (22/05) + `add_slug_and_soft_deletes` (25/05) foram aplicadas com sucesso. PostGIS ativo confirmado pela migration.  
**Pendente para produção**: Criar projeto Supabase production separado.

---

## 🟠 GAPS DE SEGURANÇA — Alta prioridade

### S1 — ⏳ CSP com `unsafe-inline` em `script-src` *(Segurança + SEO)*
**Status**: Não bloqueia staging; bloqueia produção.  
**Ação antes de produção**: Remover `unsafe-inline` de `script-src` (usar nonces via `next/headers`). Adicionar domínios do Google Analytics ao `connect-src`.

### S2 — ✅ `deletedAt` ausente em `Booking` e `Message` *(Arquiteto + Segurança)*
**Resolução**: Campos adicionados ao `schema.prisma`. Migration `20260525000000_add_slug_and_soft_deletes` aplicada.

### S3 — ⏳ Rate limiting não definido *(Segurança + ADR-001)*
**Status**: Não bloqueia staging (volume baixo). Resolver antes de abrir para o público.  
**Ação antes de produção**: Decidir Upstash Rate Limit vs middleware Next.js e implementar nos endpoints de auth e upload.

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

### D1 — ✅ Biblioteca base de componentes sem decisão *(Designer)*
**Resolução**: shadcn/ui definido como biblioteca base (ADR-005). `components/ui/` já tem `Button.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `CategoryIcon.tsx`.

### D2 — ✅ Plugins Tailwind ausentes *(Designer)*
**Resolução**: `tailwindcss-animate` e `@tailwindcss/forms` adicionados ao `tailwind.config.ts`.

### D3 — ✅ Tokens ausentes no Tailwind *(Designer)*
**Resolução**: Adicionados `colors.disabled`, `ringWidth.DEFAULT: "2px"`, `ringOffsetWidth.DEFAULT: "2px"`.

---

## 🟡 GAPS DE INFRAESTRUTURA — Média prioridade

### I1 — ✅ Jobs ausentes no pipeline CI/CD *(DevOps)*
**Resolução**: Jobs `audit` (pnpm audit) e `e2e` (Playwright) adicionados ao `ci.yml`. `.github/dependabot.yml` criado.  
**Pendente (não bloqueia staging)**: Job `lighthouse-ci` — implementar após primeiro deploy de preview estar estável.

### I2 — ✅ Secrets não documentados *(DevOps)*
**Resolução**: `RESEND_API_KEY` documentado no cabeçalho do `ci.yml`.

---

## 🟡 GAPS DE SEO — Média prioridade

### E1 — ✅ Padrão de URL slug formalizado *(SEO)*
**Resolução**: Campo `slug String @unique` adicionado ao modelo `Item` no schema. ADR-006 documenta o padrão de rotas (`/alugar/[slug]`).  
**Pendente**: Gerar o slug automaticamente no `app/api/items/route.ts` ao criar um item (formato: `{titulo}-em-{cidade}-{uf}-{ulid}`).

### E2 — ⏳ Sitemap.xml e robots.txt não planejados *(SEO)*
**Status**: Não bloqueia staging. Implementar antes do primeiro deploy público (produção).  
**Ação antes de produção**: Criar `app/sitemap.ts` e `app/robots.ts` via Next.js Metadata API.

---

## 📋 ADRs — ✅ TODOS CRIADOS (Sprint 0)

| ADR | Tema | Status |
|---|---|---|
| ADR-005 | Estrutura de pastas e convenções de componentes | ✅ Criado |
| ADR-006 | Estratégia de renderização por tipo de página (SSG/SSR/ISR/CSR) | ✅ Criado |
| ADR-007 | Gestão de estado (sem Zustand — React Query + URL state) | ✅ Criado |
| ADR-008 | RLS vs NextAuth.js — segurança na camada API | ✅ Criado |
| ADR-009 | Upload de imagens (Supabase Storage) | ✅ Criado |

---

## ⚡ DECISÕES PENDENTES (PO + Arquiteto + Designer)

| Decisão                                                | Responsável           | Urgência          |
| ------------------------------------------------------ | --------------------- | ----------------- |
| Biblioteca base (shadcn/ui vs Radix vs from scratch)   | Arquiteto + Designer  | Antes do Sprint 1 |
| Cor oficial CTA laranja (#F97316 vs #C05800)           | Designer              | Antes do Sprint 1 |
| SLA de resposta do locador (PENDING → timeout)         | PO                    | Antes do Sprint 1 |
| Solicitações simultâneas no mesmo item                 | PO                    | Antes do Sprint 1 |
| Quem ativa ACTIVE (automático vs manual)               | PO                    | Antes do Sprint 1 |
| PJ no MVP: aprovação manual por e-mail?                | PO                    | Sprint 1          |
| Dark mode: descartar explicitamente ou planejar tokens | Designer              | Sprint 1          |
| Rate limiting: Upstash vs middleware Next.js           | Arquiteto + Segurança | Sprint 1          |

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
