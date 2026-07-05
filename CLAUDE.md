# ShareO — Instruções para Claude Code

Marketplace de economia circular para aluguel local de itens. Lançamento nacional (decisão dos fundadores, jun/2026 — não citar Natal/RN como default na UI). Slogan: "Use Mais. Possua Menos."

## Repositório e ambientes

- **Código:** `C:\Users\Roberto\Documents\2026\ShareO`
- **Staging:** `https://shareo-rouge.vercel.app` — NÃO é produção
- **Produção:** ainda não existe — só após D4 (consulta jurídica) + validação total staging

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15.5 (App Router), TypeScript 5, Tailwind CSS 3, Montserrat |
| Componentes | shadcn/ui (Radix UI) + componentes próprios |
| Backend | Next.js API Routes, Prisma ORM v6 |
| Banco | PostgreSQL via Supabase (sa-east-1) |
| Auth | NextAuth.js v5 — JWT strategy **sem** PrismaAdapter |
| Real-time | Supabase Realtime (chat) |
| Mapas | Mapbox GL (`react-map-gl`) — token `NEXT_PUBLIC_MAPBOX_TOKEN` |
| Pagamentos | Stripe Checkout Sessions (Test mode — UI Stripe Connect oculta até dez/2026) |
| E-mail | Resend (`RESEND_API_KEY`) |
| Storage | Supabase Storage — `item-images` (público), `booking-photos` (público), `id-docs` (privado) |
| Hosting | Vercel (main → staging automático) |
| Mobile | Expo + React Native (`apps/mobile/`) — scaffold completo, não testado |

## Design System (v2)

- **Cores:** Navy `#003366` (primary), Verde ação `#007B3C` (brand), Verde claro `#59C686` (**nunca** com texto branco — contraste 2.07:1), Off-white `#F8FAFC` (background)
- **Fonte:** Montserrat (variable `--font-montserrat`)
- **Breakpoints:** 375px mobile, 768px tablet, 1280px desktop
- **Tap targets:** mínimo 44×44px (`min-h-11`)
- **Tokens:** `bg-surface`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-brand`, `text-success`

## Dois projetos Supabase — ATENÇÃO

| Projeto Supabase | Ref | Arquivos `.env` | Uso |
|---|---|---|---|
| **shareo-dev** | `kehbrjlllfkooauaswtp` | `.env` | Desenvolvimento local |
| **shareo-staging** | `zythygwvmrwrqmnrdufq` | `.env.local`, `.env.staging-migrate`, `.env.staging-check` | **Banco real do staging no Vercel** |

Ambos na **org corporativa** `Shareo Marketplace de aluguel` (slug `ohrwffrbcnccuflhmbpr`), FREE, NANO, sa-east-1 (migrados em 2026-06-27 — refs antigos eram dev `jtianehxosfdrhjzqvqj` / staging `fflpuoluiqmhpvcxubqi`, na org pessoal). Pooler host = **`aws-1-sa-east-1.pooler.supabase.com`**. **`shareo-prd`/produção ainda NÃO existe** — criar só pós-D4, em Pro (org FREE só cabe 2 projetos → upgrade necessário), via `migrate deploy` em banco VAZIO (nunca clonar dev/staging).

### 🔑 Trocar banco do staging exige DOIS lados (Vercel + GitHub Secrets)

O deploy de staging (`.github/workflows/deploy.yml`) injeta de **GitHub Secrets** `*_STAGING`, NÃO só do Vercel:
- `NEXT_PUBLIC_SUPABASE_URL_STAGING` / `NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING` → **inlinados no `vercel build`** (build-time)
- `DATABASE_URL_STAGING` / `DIRECT_URL_STAGING` → build + passos de migrate/seed do deploy

As env vars do **Vercel** só valem para o **runtime** (server-side: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Logo: trocar de projeto Supabase no staging = atualizar **os dois** (`gh secret set ...` + Vercel env). Se esquecer os GitHub Secrets, `NEXT_PUBLIC_SUPABASE_URL` fica inlinado no banco velho → `createAdminClient`/storage quebram mesmo com Vercel certo (sintoma: health check `db:ok` + `storage:error`). Pendentes não-bloqueantes da migração: flip `.env` local (dev), remover `public` dos Exposed schemas nos 2 projetos novos.

SQL de manutenção/migration para staging → sempre usar `zythygwvmrwrqmnrdufq` (**shareo-staging**).

**Ambiente local isolado no shareo-dev (2026-06-22):** `.env` aponta `DATABASE_URL`/`DIRECT_URL` (Prisma) **e** o cliente Supabase (URL + publishable + service_role, chaves novas `sb_*`) para o **shareo-dev**; o `.env.local` **não sobrescreve mais** o Supabase para staging (overrides removidos). Os 3 buckets (`item-images`, `booking-photos`, `id-docs`) e o schema (34 tabelas) já existem no shareo-dev. Antes havia um "split" (Prisma=dev, Storage/Realtime=staging) — resolvido. `scripts/setup-dev-storage.ts` (local) recria os buckets se preciso.

## Decisões arquiteturais

- **Auth:** JWT sem PrismaAdapter — `authorize()` faz `prisma.user.findUnique` direto
- **Segurança:** `if (resource.ownerId !== session.user.id) → 403` (RLS desabilitado — incompatível com PgBouncer)
- **Upload:** Supabase Storage via service role key server-side
- **RLS:** desabilitado — segurança via guards server-side
- **Geocoding:** Mapbox Geocoding API automático via `lib/geocodeItem.ts`
- **Filtro distância:** Haversine em JS pós-fetch (não no Prisma)
- **Cron:** `GET /api/cron/reminders` — `CRON_SECRET=shareo-cron-2026`, 08h BRT via Vercel Cron
- **Middleware cookie name:** `__Secure-authjs.session-token` em HTTPS, `authjs.session-token` em HTTP

## Módulo financeiro (MVP completo — commit 4ef3cb7)

- **D1:** PIX apenas no MVP. Stripe Connect reavaliado ~dez/2026. Código Stripe preservado mas invisível na UI.
- **D2:** Sem caução no MVP. Teto R$500 por transação.
- **D4 (BLOQUEADOR):** Consulta jurídica em análise — **nenhum go-live em produção antes do retorno.**
- Taxa plataforma: 15% (`DEFAULT_FEE_RATE = 1500` basis points em `lib/platform-config.ts`)
- Models financeiros: `OwnerPaymentAccount`, `PlatformTransaction`, `Payout`, `PlatformConfig`, `StripeEventQueue`, `ExportJob`

## Roles de admin

| AdminRole | Acesso |
|---|---|
| `ADMIN_SUPERADMIN` | Tudo, incluindo gestão de admins |
| `ADMIN_FINANCEIRO` | Financeiro + Disputas + Usuários |
| `ADMIN_OPERACIONAL` | Itens + Usuários + Disputas + Verificações |

Admins em staging:
- `admin@shareo.com.br` (`ADMIN_SUPERADMIN`) — vem do **seed** (`prisma/seed.ts`), senha **`Admin@shareo2026`**.
- `financeiro@shareo.com.br`, `operacional@shareo.com.br` — criados via **UI** `/admin/usuarios/admins` (commit `d9b763a`), **não** estão no seed; senha definida na criação (não hardcoded — fixtures E2E leem de `FIXTURE_FINANCEIRO_PASSWORD`/`FIXTURE_OPERACIONAL_PASSWORD`).

## CSP — regra importante

Qualquer `fetch()` client-side para domínio externo precisa estar no `connect-src` em `middleware.ts` (dois blocos: dev ~linha 44, prod ~linha 57). Domínios ativos: `supabase.co`, `mapbox`, `sentry`, `google analytics`, `viacep.com.br`.

Se fetch client-side cair no `catch` com "Erro de conexão" sem erro de rede aparente → primeiro suspeito é o CSP.

## Variáveis `NEXT_PUBLIC_*` no Vercel

**Nunca marcar como Sensitive** — Sensitive impede injeção no build time. Se `NEXT_PUBLIC_*` aparecer vazia no staging, verificar flag Sensitive antes de qualquer outra hipótese.

## Vercel build — armadilhas conhecidas

- `SENTRY_AUTH_TOKEN` expirado quebra o build silenciosamente — remover via `npx vercel env rm SENTRY_AUTH_TOKEN production`
- `@upstash/redis` é incompatível com Edge Runtime — usar fetch direto à API REST do Upstash no middleware
- `scripts/` e `e2e/` devem estar no `exclude` do `tsconfig.json`
- Webhook GitHub→Vercel pode parar — usar `npx vercel --prod` se deploy não disparar

## Migrations Prisma — lições

- `ALTER TYPE ... ADD VALUE` e `UPDATE` na mesma transação PG → inválido; separar em dois SQLs
- RLS policies bloqueiam `DROP COLUMN` → dropar policies antes do DROP
- SQL de reparo vai nos **dois** projetos Supabase (local e staging)

## Navegação atual

**Desktop:** `[Logo→/]  Início  Explorar  Anunciar  [?]  Olá, Nome!  [🔔]  [Avatar]`
- `AppHeader` permanece Server Component — links diretos sem dropdown (Início → `/`, Explorar → `/itens`, Anunciar → `/itens/novo`)
- Únicos popups mantidos: `HelpButton` e `UserDropdown` (ATIVIDADE + MINHA CONTA)

**Mobile:** BottomNav 4 tabs + MobileMenu com Explorar▾ / Anunciar▾ expansíveis + seção Atividade rotulada

## UX da locação (PriceCalc)

Arquivo: `app/itens/[id]/_PriceCalc.tsx`
- Modalidade **diária:** cliente informa quantidade de dias (input +/-); devolução = retirada + N dias
- Modalidade **semanal:** devolução = retirada + 7 dias (campo read-only)
- Modalidade **mensal:** devolução = retirada + 30 dias (campo read-only)
- Tabs de modalidade só aparecem se item tiver `pricePerWeek`/`pricePerMonth`

## Precificação de referência (seed e formulários)

Diária ≈ 3–5% do valor do produto. Semana = 3× diária. Mês = 15× diária.
Multiplicadores configuráveis pelo SuperAdmin em `/admin/financeiro` (chaves `pricingWeeklyMultiplier` e `pricingMonthlyMultiplier`).

| Slug categoria | Diária padrão |
|---|---|
| ferramentas | R$35 |
| eletronicos | R$100 |
| casa-jardim | R$30 |
| construcao | R$45 |
| esporte | R$60 |
| festas | R$80 |

## Arquivos de referência

- `prisma/schema.prisma` — fonte da verdade do modelo de dados
- `shareo-prototipo-v3b.html` — protótipo visual ativo (referência de UI desde 06/06/2026)
- `lib/pricing.ts` — `calcBookingTotal()` com desconto semanal/mensal
- `lib/geocodeItem.ts` — geocoding fire-and-forget
- `lib/email.ts` — todos os templates de e-mail transacional
- `lib/platform-config.ts` — `getPlatformFeeRate()`, `calcSplit()`, `CHECKOUT_MAX_CENTS=50000`
- `docs/adr/` — ADR-001 a ADR-020
- `docs/STATUS.md` — estado atual do projeto
- `docs/backlog-atividades-priorizadas.md` — backlog P0–P3

## Template de Importação PJ (Google Sheets)

ID do template: `1NEd7Dn-zASPcNwuwMWHTErJWSVgKl3ByinRWfGIjcQI`
URL de cópia para usuários: `https://docs.google.com/spreadsheets/d/{ID}/copy`

**Para atualizar o template original** (requer acesso de edição ao Google Sheets — não há credenciais de API no projeto, editar manualmente):

1. **Linhas de exemplo** — 2 linhas já inseridas (Furadeira/Ferramentas + Projetor/Eletrônicos)
2. **Dropdown `categoria`** (C2:C1000) → Dados → Validação → Lista:
   `Ferramentas,Eletrônicos,Construção,Esporte,Festas,Eletrodomésticos`
3. **Dropdown `condicao`** (G2:G1000) → Dados → Validação → Lista:
   `NOVO,EXCELENTE,BOM,REGULAR`
4. **Moeda R$** (D2:F1000) → Formatar → Número → Personalizado: `R$ #.##0,00`

O template CSV local está em `public/template-importacao.csv` (6 linhas de exemplo, sem dropdowns).
Parser valida categoria case-insensitive e condição após `.toUpperCase()`.

## Subagentes (`.claude/Agents/`)

`arquiteto-shareo`, `fullstack-dev-shareo`, `designer-shareo`, `devops-shareo`, `qa-shareo`, `seguranca-shareo`, `product-owner-shareo`, `gestor-projeto-shareo`, `seo-shareo`

## Estado atual (12/06/2026)

Commit `0fc0480`. Staging validado (smokes #1–#32 passando). Aguardando **D4** (jurídico) para go-live produção.

Scripts temporários deletados ✅ (2026-06-12). Hardcoded P0 movidos para PlatformConfig ✅.

Próximos passos: aguardar D4 → criar Supabase production → tag v1.1.0.
