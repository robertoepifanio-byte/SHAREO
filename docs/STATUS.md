# ShareO — Status do Projeto

**Atualizado em**: 2026-06-04  
**Ambiente staging**: https://shareo-rouge.vercel.app (branch `main`, deploy automático)  
**Último commit**: `ee506a0`

---

## Resumo Executivo

Produto completo em staging. Todas as fases H1→H3 + pós-H3 + v2 UX + pós-v2 foram concluídas. Fluxo ponta-a-ponta funcional: auth → anúncio → busca/mapa → reserva → chat → devolução bilateral → avaliação → pagamento Stripe. Próximo passo: itens de polimento listados abaixo antes de abrir produção.

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
| Sentry (`sentry.client/server/edge.config.ts`) | ✅ Configurado |
| Supabase **production** | ❌ Não criado — aguarda validação final em staging |

---

## Testes

| Suite | Status |
|---|---|
| Unit — `bookings`, `pricing`, `crypto`, `auth`, `rateLimit`, `middleware`, `haversine`, `co2`, `format`, `geo` | ✅ Escritos |
| Integration — `bookings/patch`, `bookings/reviews`, `auth/register`, `conversations/messages`, `items/get/post/patch` | ✅ Escritos |
| E2E Playwright — `auth`, `booking-flow`, `navigation`, `search-filter`, `admin`, `chat`, `favorites`, `responsive`, `error-pages`, `anuncio`, `review` | ✅ Escritos |
| `coverageThreshold` — 70% para `pricing`, `crypto`, `bookings` (módulos P0) | ✅ Configurado |
| Jest `transformIgnorePatterns` para `next-auth@5` | ❌ Config global pendente (mock local em `get.test.ts`) |

---

## Pendências antes de produção

> Fonte de verdade completa: `docs/backlog-atividades-priorizadas.md`

### 🔴 P0 — Bloqueia produção

| Item | Status | Detalhe |
|---|---|---|
| **CSP com nonces** | ✅ | `unsafe-inline` removido; nonce por request em `middleware.ts` |
| **Rate limiting Upstash** | ✅ (código) / ⚙️ (env vars) | Código pronto; adicionar `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` no Vercel |
| **Supabase production** | ⏳ | Aguarda validação 100% de staging |

### 🟠 P1 — Fluxo incompleto (3 itens)

| Item | Detalhe |
|---|---|
| **Preservação de contexto de busca** | Link "← Voltar para resultados" em `app/itens/[id]/page.tsx:251` aponta fixo para `/itens` — deve preservar filtros da URL |
| **Extensão de prazo — UI** | API `extend` completa; falta botão no `_BookingActions.tsx` para locatário solicitar e proprietário responder |
| **Relatório de problema estruturado** | "Abrir disputa" com textarea existe; falta formulário categorizado (item não funciona / danificado / faltam acessórios / outro) + foto |

### 🟡 P2 — Polimento (8 itens) · 🟢 P3 — Pós-produção (10 itens)

Ver `docs/backlog-atividades-priorizadas.md`.

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
