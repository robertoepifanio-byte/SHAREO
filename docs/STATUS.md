# ShareO — Status do Projeto

**Atualizado em**: 2026-06-05  
**Ambiente staging**: https://shareo-rouge.vercel.app (branch `main`, deploy automático)  
**Último commit**: `65cbf67`  
**Release estável**: [`v1.0.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.0.0)

---

## Resumo Executivo

**✅ Módulo Financeiro MVP completo.** Fases 0–4 implementadas e deployadas em staging (commit `65cbf67`). Fluxo financeiro ponta-a-ponta: PIX cadastrado → checkout com split → payout automático → four-eyes admin → chargebacks → exportação CSV → informe IR → relatório mensal. Suite E2E financeiro: **33 testes** (suite base: 87 passed). ADRs 012–020 documentados. Próximo passo: validação manual de staging + consulta jurídica (D4) antes de go-live em produção.

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
| **Sessões jun/04** | Nav reestruturada (dropdowns), HelpButton, MobileMenu expansível, pills de categoria 2 linhas |
| **Módulo Financeiro (jun/05)** | PIX, split, payout, four-eyes, chargebacks, exportação CSV, informe IR, relatório mensal |

---

## Módulo Financeiro — Detalhe (jun/05)

| Fase | Itens | Commit |
|---|---|---|
| Fase 0 | ADRs 012–017 | `2ef6445` |
| Fase 1 | AdminRoles, schema financeiro, cadastro PIX, checkout split, teto R$500 | `2ef6445` |
| Fase 2 | Cron payout, trigger 3 dias, dashboards GMV/receita, audit log, four-eyes | `2ef6445` |
| E2E base | 21/22 testes passando | `80e7640` |
| Fase 3 | FIN-7 chargebacks (webhook dispute) | `31082cf` |
| Fase 3 | FIN-8 exportação CSV síncrona/assíncrona + ExportJob | `8038c8f` |
| Fase 4 | Informe IR, relatório mensal, card reavaliação Stripe Connect | `b66490c` |
| Docs | ADRs 018–020, CLAUDE.md atualizado | `65cbf67` |

**Decisões dos fundadores (D1–D4):**
- D1: PIX no MVP, Stripe Connect BR reavaliado ~dez/2026
- D2: Sem caução, teto R$500 por transação
- D3: AdminRoles implementadas (SUPERADMIN, FINANCEIRO, OPERACIONAL)
- D4: Consulta jurídica pendente — **go-live produção bloqueado até retorno**

---

## Infra e ambiente

| Item | Status |
|---|---|
| Staging Vercel (`shareo-rouge.vercel.app`) | ✅ Deployado |
| Supabase staging (`fflpuoluiqmhpvcxubqi`, sa-east-1) | ✅ Ativo — migrations 000000–000002 aplicadas |
| Supabase local dev (`jtianehxosfdrhjzqvqj`) | ✅ Ativo |
| CI/CD GitHub Actions (lint → test → build → deploy) | ✅ Ativo |
| UptimeRobot em `/api/health` (5min) | ✅ Ativo |
| Vercel Cron — reminders, auto-cancel, expire, return, reengagement, payout | ✅ Ativos |
| Vercel Cron — monthly-report (1º/mês 12h UTC) | ✅ Registrado em `vercel.json` |
| Sentry (`sentry.client/server/edge.config.ts`) | ✅ Source maps + alertas ativos |
| Upstash Redis (rate limiting) | ✅ Ativo |
| PWA | ✅ Ícones + screenshots + service worker validados |
| Supabase **production** | ⏳ Aguarda D4 (consulta jurídica) |

---

## Testes

| Suite | Status |
|---|---|
| Unit — `bookings`, `pricing`, `crypto`, `auth`, `rateLimit`, `middleware`, `haversine`, `co2`, `format`, `geo` | ✅ Escritos |
| Integration — `bookings/patch`, `bookings/reviews`, `auth/register`, `conversations/messages`, `items/get/post/patch` | ✅ Escritos |
| E2E Playwright staging — suite base | ✅ **87 passed / 0 failed / 20 skipped** |
| E2E Playwright — módulo financeiro (`e2e/financeiro.spec.ts`) | ✅ **33 testes** (21 base + FIN-7/8/Fase4) |
| `coverageThreshold` — 70% para `pricing`, `crypto`, `bookings` | ✅ Configurado |

---

## Releases

| Tag | Commit | Data | Descrição |
|---|---|---|---|
| `v1.0` | — | pré-v2 | Estado antes da v2 UX |
| `v1.0.0` | `40d1a2b` | 2026-06-04 | Staging validado — ponto de recuperação estável |
| *(próxima)* | `65cbf67` | 2026-06-05 | Módulo financeiro MVP completo — candidata a `v1.1.0` |

---

## Pendências antes de produção

### ✅ P0, P1, P2 — Todos concluídos
### ✅ Módulo Financeiro MVP — Completo

### ⏳ Bloqueadores de produção

| Item | Detalhe |
|---|---|
| **D4 — Consulta jurídica** | Nenhum go-live em produção antes do retorno do jurídico |
| **Supabase production** | Criar 3º projeto Supabase isolado + GitHub environment `production` com Required Reviewers |
| **Validação manual staging financeiro** | Login `admin@shareo.com.br`: testar exportação CSV, painel de disputas, informe IR como proprietário |

### 🟢 Próximas frentes (pós-produção)

| Item | Detalhe |
|---|---|
| FIN-6 — Caução | Implementar após V1-Financeiro estável em produção |
| Stripe Connect BR | Reavaliação prevista ~dez/2026 (D1) |
| IR — PDF formal | ADR-019: sem PDF no MVP, adicionar em V1+ se houver demanda |
| Relatório mensal por e-mail | ADR-020: V1+ quando SendGrid/Resend configurado |
| P3 backlog | Lighthouse, k6, gamificação, Expo, CO₂ — ver `docs/backlog-atividades-priorizadas.md` |

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
| Caução | Adiada para pós V1-Financeiro (D2) |
| Testes E2E staging | `workers: 1` obrigatório — estado compartilhado entre specs |
| Pagamentos MVP | PIX centralizado (D1) — Stripe Connect BR reavaliado ~dez/2026 |
| Exportação financeira | Síncrono ≤90 dias, assíncrono >90 dias (ADR-016) |
| Retenção de dados | 5 anos CTN Art. 173, anonimização LGPD (ADR-017) |
