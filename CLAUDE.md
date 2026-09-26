# ShareO — Instruções para Claude Code

Marketplace de economia circular para aluguel local de itens. Lançamento nacional (decisão dos fundadores, jun/2026 — não citar Natal/RN como default na UI). Slogan: "Use Mais. Possua Menos."

## Repositório e ambientes

- **Código:** `C:\Users\Roberto\Documents\2026\ShareO`
- **Staging:** `https://shareo-rouge.vercel.app` — NÃO é produção
- **Produção:** projeto `shareo-prd`/`shareo-prod` **criado em 2026-08-05** (exceção autorizada pelo fundador em 04/08) — ⚠️ **o alias `https://shareo-prod.vercel.app` é PÚBLICO** (200 sem login em `/api/health`, `/cadastro` e `/login`, verificado com curl em 24/09/2026; `noindex` ligado; endpoints de cron e admin respondem 401): a Vercel Deployment Protection cobre só as URLs de *deployment* e de preview, não o alias de produção, ao contrário do que estava escrito aqui. Hoje há só 2 usuários (os admins). **`shareo.com.br` serve a landing da campanha** (não o marketplace). **D4 desbloqueado pelos fundadores em 24/09/2026** (risco assumido, sem parecer jurídico assinado; go-live previsto para **01/10/2026**) — as pendências jurídicas seguem ABERTAS em `docs/juridico/decisao-desbloqueio-d4-2026-09-24.md`. Cada passo de produção com efeito público (apontar o domínio para o app, Stripe live, tag `web-v*`) continua exigindo instrução explícita do fundador. Ver também `docs/juridico/checklist-conformidade-juridica.md` e memória `project-d4-juridico`.

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
| Pagamentos | **Stripe Connect** — PSP único (split automático, [ADR-028](docs/adr/ADR-028-reversao-stripe-connect.md)). Código construído, **não exercitado ponta a ponta**. Checkout é **só cartão**. **Mercado Pago descartado e REMOVIDO do código em 2026-08-24** (decisão do fundador): rotas, SDK, flag e componentes apagados. |
| E-mail | Resend (`RESEND_API_KEY`) |
| Storage | Supabase Storage — `item-images` (público), `booking-photos` (público), `id-docs` (privado) |
| Hosting | Vercel (main → staging automático) |
| Mobile | Expo + React Native (`apps/mobile/`) — estilo via `StyleSheet` + tokens do `lib/theme.tsx` (**não** NativeWind, ver abaixo); redesign por transcrição do site (PRs #171–#173) |

## 📱 App mobile — REGRA DE TRANSCRIÇÃO LITERAL (fundador, 2026-07-02)

**Qualquer trabalho em `apps/mobile/` TRANSCREVE o site responsivo em 375px — nunca "adapta", "melhora" ou inventa.** Regras detalhadas, padrão `StyleSheet` + `useTheme()` e gotchas estão em `apps/mobile/CLAUDE.md` (carrega ao trabalhar na pasta). Para tela do app: `/shareo-transcrever-tela <rota>`. Device: `scripts/adb-device.sh`.

## ✅ Regra de verificação antes de reportar "resolvido"

**Nunca marcar item como resolvido/concluído sem evidência de verificação** — isso já minou a confiança do fundador ~10× (status dizia ✅ e o bug persistia no device). Evidência mínima por tipo:
- **Web/staging:** deploy concluído (`gh run` verde + hash do deployment confirmado) e comportamento verificado na URL de staging — código mesclado ≠ deployado.
- **Mobile:** teste RNTL verde + bundle Metro ok; mudanças visuais/fluxo exigem confirmação em device/emulador (`scripts/adb-device.sh shot`). `npx tsc --noEmit` NÃO é evidência (babel-preset-expo quebra onde tsc passa).
- Sem evidência → reportar como "implementado, aguardando verificação", nunca ✅.

## Design System (v2)

- **Cores:** Navy `#003366` (primary), Verde ação `#007B3C` (brand), Verde claro `#59C686` (**nunca** com texto branco — contraste 2.07:1), Off-white `#F8FAFC` (background)
- **Fonte:** Montserrat (variable `--font-montserrat`)
- **Breakpoints:** 375px mobile, 768px tablet, 1280px desktop
- **Tap targets:** mínimo 44×44px (`min-h-11`)
- **Tokens:** `bg-surface`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-brand`, `text-success`

## Dois projetos Supabase — ATENÇÃO

| Projeto Supabase | Ref | Arquivos `.env` | Uso |
|---|---|---|---|
| **shareo-staging** | `zythygwvmrwrqmnrdufq` | `.env.local`, `.env.staging-migrate`, `.env.staging-check` | **Banco real do staging no Vercel** |

**`shareo-dev` (`kehbrjlllfkooauaswtp`) foi EXCLUÍDO em 2026-08-04** (uso real mínimo — 1 usuário, 8 itens, 0 reservas, parado desde 16/07; ~$10/mês economizados enquanto D4 não fecha). `next dev` local **não tem banco funcional até um projeto novo ser criado** — `.env` local ainda tem as credenciais antigas, mas apontam para um projeto que não existe mais. Staging na **org corporativa** `Shareo Marketplace de aluguel` (slug `ohrwffrbcnccuflhmbpr`), **PRO** (upgrade em 2026-08-04, remove o limite de 2 projetos/org), NANO, sa-east-1 (migrado em 2026-06-27 — ref antigo era `fflpuoluiqmhpvcxubqi`, na org pessoal, deletado em 22/07). Pooler host = **`aws-1-sa-east-1.pooler.supabase.com`**. **`shareo-prd`/produção ainda NÃO existe** — criar só pós-D4 (regra absoluta), via `migrate deploy` em banco VAZIO (nunca clonar staging). **Custo real confirmado:** projeto novo na org Pro tem ~$10/mês adicional (não é grátis — a org Pro só remove o limite de contagem, cada projeto tem seu próprio custo de compute).

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
- **Cron:** `GET /api/cron/reminders` — autenticado por `Authorization: Bearer $CRON_SECRET` (valor **só** em env/GitHub Secrets; nunca versionar — repo público), 08h BRT via Vercel Cron
- **Middleware cookie name:** `__Secure-authjs.session-token` em HTTPS, `authjs.session-token` em HTTP

## Módulo financeiro (MVP completo — commit 4ef3cb7)

- **D1 (pagamentos):** decisão evoluiu — PIX manual da plataforma (MVP inicial) → Mercado Pago Modelo B (ADR-026, 2026-06-28) → reversão para Stripe Connect (ADR-028, 2026-08-19) → **Mercado Pago descartado por completo (2026-08-24)**. **PSP único: Stripe Connect.** O código do MP foi **removido** em 24/08 (rotas `/api/mp/*` e `/api/payments/mp/*`, `lib/mercadopago.ts`, `MpPayButton`, flag `mercadoPagoEnabled`, dependência `mercadopago`). Os campos de banco saíram na migração `20260824190000_remove_mercado_pago`. PIX manual da plataforma removido do código (a chave pessoal do fundador não existe mais); o PIX que resta em `/perfil/recebimentos` é o caminho **manual** de repasse, usado quando o Connect do proprietário não está `ACTIVE`.
- **D2:** Sem caução no MVP. Teto R$500 por transação.
- **D4 (desbloqueado em 24/09/2026 por decisão dos fundadores, risco assumido):** a advogada orienta sem cobrar e não assina nada até o projeto "Decolar"; o Raimundo (Encarregado) assumiu o risco. As pendências seguem abertas, listadas em `docs/juridico/decisao-desbloqueio-d4-2026-09-24.md`. Não reportar nenhuma delas como resolvida.
- Taxa plataforma: 15% (`DEFAULT_FEE_RATE = 1500` basis points em `lib/platform-config.ts`)
- Models financeiros: `OwnerPaymentAccount`, `PlatformTransaction`, `Payout`, `PlatformConfig`, `StripeEventQueue`, `ExportJob`

## Roles de admin

Papéis: `ADMIN_SUPERADMIN` (tudo, inclusive gestão de admins), `ADMIN_FINANCEIRO` e `ADMIN_OPERACIONAL` (áreas distintas, não hierárquicas) — o que cada um acessa está em `prisma/schema.prisma` e nos guards.

Admins em staging (conferido no banco em 2026-09-01):
- `roberto.epifanio@gmail.com` — **`ADMIN_SUPERADMIN`**. É a conta para validar o painel completo.
- `admin.fixture@shareo-test.com` — `ADMIN_SUPERADMIN`, usada pelas fixtures E2E.
- `admin@shareo.com.br` — **`ADMIN_FINANCEIRO` hoje**, senha `Admin@shareo2026`. 🪤 O seed **cria** essa conta como `ADMIN_SUPERADMIN`, mas o upsert tem `update: {}` — num usuário que já existe ele não altera nada. A conta foi rebaixada depois (provavelmente pela UI) e **rodar o seed de novo NÃO restaura o papel**. Quem usar esta conta esperando superadmin leva 403 nas telas de gestão de admins e acha que é bug de permissão.
- `raimundo1965@gmail.com`, `financeiro@shareo.com.br` — `ADMIN_FINANCEIRO`.
- `thiagogarbuio10@gmail.com`, `operacional@shareo.com.br` — `ADMIN_OPERACIONAL`.

`financeiro@shareo.com.br` e `operacional@shareo.com.br` foram criados via **UI** `/admin/usuarios/admins` (commit `d9b763a`), **não** estão no seed; senha definida na criação (não hardcoded — fixtures E2E leem de `FIXTURE_FINANCEIRO_PASSWORD`/`FIXTURE_OPERACIONAL_PASSWORD`).

🪤 **A suíte E2E cria admins e nunca os remove.** Em 01/09 havia 5 contas `admin.e2e.<timestamp>@shareo-test.com` acumuladas desde 27/08, todas `ADMIN_OPERACIONAL` — removidas na mesma data. Elas voltam a cada rodada da suíte: se a lista de admins encher de novo, é isso, não invasão.

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

## Precificação de referência (seed e formulários)

Diária ≈ 3–5% do valor do produto. Semana = 3× diária. Mês = 15× diária.
Multiplicadores configuráveis pelo SuperAdmin em `/admin/financeiro` (chaves `pricingWeeklyMultiplier` e `pricingMonthlyMultiplier`).

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

Procedimento de atualização do template → skill `shareo-template-importacao`.

