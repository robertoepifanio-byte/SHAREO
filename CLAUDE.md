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

| Arquivo | Projeto Supabase | Uso |
|---|---|---|
| `.env` (local) | `jtianehxosfdrhjzqvqj` | Desenvolvimento local |
| `.env.staging-migrate` | `fflpuoluiqmhpvcxubqi` | **Banco real do staging no Vercel** |

SQL de manutenção/migration para staging → sempre usar `fflpuoluiqmhpvcxubqi`.

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

Admins seed em staging: `admin@shareo.com.br`, `financeiro@shareo.com.br`, `operacional@shareo.com.br` (senha `ShareO@2026`).

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
| moda | R$50 |
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

## Subagentes (`.claude/Agents/`)

`arquiteto-shareo`, `fullstack-dev-shareo`, `designer-shareo`, `devops-shareo`, `qa-shareo`, `seguranca-shareo`, `product-owner-shareo`, `gestor-projeto-shareo`, `seo-shareo`

## Scripts temporários a deletar antes de produção

`scripts/reset-fixture-pwd.ts`, `scripts/delete-e2e-admins.ts`, `scripts/clear-rl.mjs`, `scripts/fix-admin-roles.ts`, `scripts/set-fixture-admin-role.ts`, `scripts/verify-admin-sessions.ts`

## Estado atual (07/06/2026)

Commit `e2ffbc7`. Staging validado (smokes #1–#32 passando). Aguardando **D4** (jurídico) para go-live produção.

Próximos passos: deletar scripts temporários → aguardar D4 → criar Supabase production → tag v1.1.0.
