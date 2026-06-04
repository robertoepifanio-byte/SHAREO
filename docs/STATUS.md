# ShareO — Status do Projeto

**Atualizado em**: 2026-06-04  
**Ambiente staging**: https://shareo-rouge.vercel.app (branch `main`, deploy automático)  
**Último commit**: `c447e9b`

---

## Resumo Executivo

**Pronto para validação final de staging.** P0 + P1 + P2 concluídos. Fluxo ponta-a-ponta funcional: auth → anúncio → busca/mapa → reserva → chat → devolução bilateral → avaliação → pagamento Stripe. PWA instalável, Sentry monitorando, rate limiting Upstash ativo, CSP com nonces. Após aprovação de staging: criar Supabase production e deploy via `git tag v1.0.0`.

---

## Fases concluídas

| Fase | Destaques |
|---|---|
| **H1 MVP** | Auth JWT, CRUD itens, busca/filtros, chat Supabase Realtime, avaliações, favoritos, admin |
| **H2 Growth** | E-mail transacional (Resend), analytics PJ, vitrine `/loja/[slug]`, CSV import, PJ Premium |
| **H3 Scale** | Stripe Checkout Sessions, late fee, outbound webhooks, React Native scaffold |
| **Pós-H3** | SEO (sitemap/robots), PWA (manifest/service worker), geocoding automático, mapa Mapbox |
| **v2 UX** | Paleta Navy/Verde, BookingProgressBar (5 etapas), FilterBottomSheet, StickyBookingCTA |
| **Pós-v2** | Confirmação devolução bilateral, status DRAFT p/ itens sem foto, área de perfil (7 sub-páginas) |
| **Sessões jun/04** | Nav reestruturada (Início/Explorar/Anunciar dropdowns), HelpButton, MobileMenu expansível, categoria "Casa e Cozinha" |

---

## Infra e ambiente

| Item | Status |
|---|---|
| Staging Vercel (`shareo-rouge.vercel.app`) | ✅ Deployado |
| Supabase staging (`fflpuoluiqmhpvcxubqi`, sa-east-1) | ✅ Ativo |
| Supabase local dev (`jtianehxosfdrhjzqvqj`) | ✅ Ativo |
| CI/CD GitHub Actions (lint → test → build → deploy) | ✅ Ativo |
| UptimeRobot em `/api/health` (5min) | ✅ Ativo |
| Vercel Cron (`/api/cron/reminders`, 08h BRT) | ✅ Ativo |
| Sentry (`sentry.client/server/edge.config.ts`) | ✅ Source maps + alertas ativos |
| Upstash Redis (rate limiting) | ✅ Env vars no Vercel — ativo em produção |
| PWA | ✅ Ícones + screenshots + service worker validados |
| Supabase **production** | ⏳ Aguarda validação final de staging |

---

## Testes

| Suite | Status |
|---|---|
| Unit — `bookings`, `pricing`, `crypto`, `auth`, `rateLimit`, `middleware`, `haversine`, `co2`, `format`, `geo` | ✅ Escritos |
| Integration — `bookings/patch`, `bookings/reviews`, `auth/register`, `conversations/messages`, `items/get/post/patch` | ✅ Escritos |
| E2E Playwright — `auth`, `booking-flow`, `navigation`, `search-filter`, `admin`, `chat`, `favorites`, `responsive`, `error-pages`, `anuncio`, `review` | ✅ Escritos |
| `coverageThreshold` — 70% para `pricing`, `crypto`, `bookings` (módulos P0) | ✅ Configurado |
| Jest `transformIgnorePatterns` para `next-auth@5` | ✅ Corrigido — cobre `@upstash`, `next-auth`, `@auth` |

---

## Pendências antes de produção

> Fonte de verdade completa: `docs/backlog-atividades-priorizadas.md`

### ✅ P0, P1, P2 — Todos concluídos

| Grupo | Itens |
|---|---|
| **P0** | CSP nonces ✅ · Upstash Redis ✅ · Sentry ✅ |
| **P1** | Contexto de busca ✅ · Extensão de prazo UI ✅ · Relatório estruturado ✅ |
| **P2** | PWA ✅ · /sobre ✅ · stubs ✅ · Jest ✅ · Sentry alertas ✅ · Countdown ✅ · Onboarding ✅ |

### ⏳ Único pendente antes de produção

| Item | Detalhe |
|---|---|
| **Supabase production** | Criar 3º projeto Supabase isolado + GitHub environment `production` com Required Reviewers. Deploy via `git tag v1.0.0 && git push origin v1.0.0` |

### 🟢 P3 — Pós-produção (10 itens)

Ver `docs/backlog-atividades-priorizadas.md` — Lighthouse, k6, gamificação, Expo, CO₂, etc.

---

## Decisões técnicas consolidadas

| Decisão | Escolha |
|---|---|
| Auth | NextAuth.js v5 — JWT sem PrismaAdapter (`authorize()` → `prisma.user.findUnique` direto) |
| RLS | **Desabilitado** — incompatível com PgBouncer. Segurança via `ownerId !== session.user.id → 403` |
| Upload | Supabase Storage via service role key server-side |
| Geocoding | Mapbox API fire-and-forget em `lib/geocodeItem.ts` |
| Filtro distância | Haversine em JS pós-fetch (não no Prisma) |
| NEXT_PUBLIC_* no Vercel | **Nunca marcar como Sensitive** — não é injetado no build |
| Dark mode | Fora do escopo — não planejado para H1 |
| WhatsApp | Fora do escopo — decisão explícita do produto |
| Caução | Informativo — combinado fora da plataforma no MVP |
