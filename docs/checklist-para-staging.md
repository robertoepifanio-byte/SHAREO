# Checklist — Colocar o Projeto em Staging

**Atualizado em**: 25/05/2026 (histórico — staging deployado em produção desde 03/06/2026)  
**Status**: ✅ CONCLUÍDO — https://shareo-rouge.vercel.app está no ar  
**Próximo passo**: ver `docs/backlog-atividades-priorizadas.md` para pendências antes de produção

> **Estado atual do codebase**: A base do código já existe (`app/`, `components/`, `lib/`, migrations, `node_modules`, `.env.local`). O que falta é principalmente infraestrutura de CI/CD e verificação de integridade do build.

---

## ✅ Já está feito — não fazer de novo

| Item | Evidência |
|---|---|
| Supabase staging provisionado | `.env.local` existe; migrations aplicadas |
| `pnpm install` executado | `node_modules/` existe |
| Migrations rodadas | `prisma/migrations/20260522000000_init` + `20260525000000_add_slug_and_soft_deletes` |
| `schema.prisma` com `deletedAt` e `slug` | Migration `add_slug_and_soft_deletes` aplicada |
| `tailwind.config.ts` corrigido | `brand.cta: #C05800`, plugins, tokens |
| `ci.yml` corrigido | PG15, threshold 0%, jobs `audit` + `e2e` |
| `jest.setup.ts` completo | MSW + jest-axe configurados |
| `playwright.config.ts` criado | `e2e/smoke.spec.ts` existe |
| ADRs 005–009 criados | Pasta `ADRs/` com todos os arquivos |
| Estrutura de pastas criada | `app/`, `components/`, `lib/`, `src/mocks/` |
| Ícones e logos disponíveis | `public/icones/` com PNGs já convertidos |

---

## ❌ O QUE FALTA PARA STAGING

### PASSO 1 — GitHub: criar environment `staging` e configurar secrets
*(fazer no browser: github.com → repositório → Settings → Environments)*

**Criar environment `staging`** (sem proteção — deploy automático em PRs):

| Secret | Onde obter |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → URI (Transaction mode) |
| `DIRECT_URL` | Supabase → Settings → Database → Connection string → URI (Session mode / Direct) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `AUTH_SECRET` | Gerar: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Gerar: `openssl rand -base64 32` |
| `RESEND_API_KEY` | resend.com → API Keys |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | mapbox.com → Access Tokens |

> **Obs**: `NEXT_PUBLIC_*` precisam também ser configurados nas Environment Variables do Vercel (não apenas no GitHub), pois o Vercel precisa deles no build.

---

### PASSO 2 — Vercel: criar e linkar o projeto
*(fazer no browser: vercel.com)*

1. New Project → Import Git Repository → selecionar o repositório ShareO
2. Framework: **Next.js** | Root Directory: `/`
3. **Não** adicionar env vars manualmente agora — o CI/CD injeta via secrets
4. Após criar, copiar do painel do Vercel:
   - `VERCEL_ORG_ID` (Account Settings → General → Your ID)
   - `VERCEL_PROJECT_ID` (Project Settings → General → Project ID)
5. Gerar token: Vercel → Account Settings → Tokens → Create Token
6. **Adicionar como Repository Secrets no GitHub** (Settings → Secrets → Actions):
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

---

### PASSO 3 — Verificar build local antes de abrir PR

```bash
# No terminal, na raiz do projeto:
pnpm type-check          # zero erros TypeScript
pnpm lint                # zero erros ESLint
pnpm test                # testes passam (threshold 0%)
pnpm build               # build Next.js completa sem erros
```

Se o build falhar, corrigir antes de abrir o PR.

---

### PASSO 4 — Abrir PR e verificar CI

```bash
git checkout -b feat/sprint0-setup
git add .
git commit -m "chore: sprint 0 setup — config, ADRs, test infra, schema fixes"
git push origin feat/sprint0-setup
# Abrir PR no GitHub
```

**Verificar que os jobs passam no CI:**
- [ ] `lint` — `next lint` + `tsc --noEmit`
- [ ] `test` — Jest com threshold 0% (`--passWithNoTests` se necessário)
- [ ] `audit` — `pnpm audit --audit-level=high` sem CVEs críticos
- [ ] `build` — `next build` completa
- [ ] `e2e` — smoke test da landing page passa
- [ ] Vercel cria preview deploy automaticamente

---

### PASSO 5 — Merge e validar staging

```bash
# Após CI verde, fazer merge do PR para main
# O job deploy-staging dispara automaticamente
```

**Verificar em staging:**
- [ ] URL de staging abre sem erro 500
- [ ] Landing page renderiza (`/`)
- [ ] Página de login abre (`/login`)
- [ ] Página de cadastro abre (`/cadastro`)
- [ ] API de auth responde (`/api/auth/providers`)
- [ ] Prisma Studio conecta ao banco: `pnpm db:studio`

---

## ⏳ DEFERIDO — Fazer após validação em staging, antes de produção

| Item | Motivo do diferimento |
|---|---|
| **Supabase production** — criar projeto separado | Staging precisa estar validado antes |
| **GitHub environment `production`** — com Required reviewers | Depende de staging validado |
| **Sentry** — criar projeto `shareo-web` | Útil ter em staging, crítico em produção |
| **CSP `unsafe-inline`** — remover de `script-src` | Não bloqueia staging; obrigatório antes de produção pública |
| **Rate limiting** — Upstash ou middleware | Volume baixo em staging; obrigatório antes de produção |
| **Sitemap.xml e robots.txt** — `app/sitemap.ts` + `app/robots.ts` | Não há indexação em staging |
| **Job Lighthouse CI** — mede Core Web Vitals no CI | Precisa de preview URL estável primeiro |
| **Slug gerado automaticamente** — no `app/api/items/route.ts` | Bloqueia SEO, não bloqueia staging |

---

## 📋 Pendências de produto (não bloqueiam staging, bloqueiam Sprint 1 planning)

Itens a resolver com o PO antes do primeiro Sprint 1 planning:

- [ ] Critérios de aceite Gherkin para F02, F06, F07, F11, F12, F13, F14
- [ ] Features implícitas sem Feature ID: recuperação de senha, verificação de e-mail, exclusão de conta (LGPD), calendário de disponibilidade
- [ ] SLA do PENDING: quantas horas antes de expirar para CANCELLED?
- [ ] Transição CONFIRMED → ACTIVE: automática por data ou manual pelo locador?
- [ ] Solicitações simultâneas no mesmo item: aceitar múltiplos PENDING ou bloquear?
- [ ] Wireframes para F11 (Favoritos), F13 (Admin), F14 (Notificações) — ausentes do protótipo

---

*Documento gerado em 25/05/2026 a partir da revisão consolidada de 4 fases.*  
*Ver `revisao-pre-sprint1.md` para o histórico completo de gaps identificados e resoluções.*
