# ShareO — Status do Projeto

**Atualizado em**: 2026-06-12 (sessão — lançamento nacional + fixes UI + re-seed staging por capitais)
**Ambiente staging**: https://shareo-rouge.vercel.app (⚠️ deploys automáticos GitHub→Vercel aparecem **Canceled** — deploy real é manual: `npx vercel --prod`)
**Último commit**: `ac88374`
**Release atual**: [`v1.3.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.3.0) — Lançamento Nacional + Embaixadores (commit `60b5b92`, jun/12) — aguarda D4 para produção
**Release anterior**: [`v1.2.0`](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/v1.2.0) (a v1.1.0 planejada foi absorvida pela v1.2.0)

---

## ⚠️ BLOQUEADOR ATIVO

**D4 — Consulta jurídica pendente.** Nenhuma atividade de produção (criação de projeto Supabase, deploy, DNS, go-live) antes do retorno formal do jurídico.

---

## Resumo Executivo

**✅ Staging re-seedado por capitais** (jun/12). 29 itens demo antigos de Natal soft-deletados (preservados itens E2E — a "Câmera Fixture E2E Smoke Test" tem 235 bookings da suíte); `seed-demo-items.ts` recriou 21 itens, 3 por capital (SP, RJ, BH, Curitiba, POA, Salvador, Recife), **todos com foto validada**. Regra: só sobe item com foto — os 8 itens do `prisma/seed.ts` (sem imagens) não foram recriados. Validado no banco e na API pública.

**✅ Fixes UI da sessão jun/12** (commits `9a7e395`–`031ed30`). (1) Badge do sino zera ao ler a mensagem — abrir conversa marca notificações `NEW_MESSAGE` como lidas + novo `PATCH /api/notifications/[id]/read` + clique individual no dropdown (optimistic). (2) Compartilhamento embaixador: og:description do /cadastro e template WhatsApp reescritos. (3) Endereço: dados salvos exibidos; placeholders "Ex: …" removidos; criar conta sem cidade/UF pré-preenchidos. (4) Telefone do perfil: placeholder "55 99 999999999" + normalização para `+55DDDNÚMERO` no submit.

**✅ Lançamento nacional — referências a Natal/RN removidas** (commit `7b83b4a`, jun/12). Decisão dos fundadores: o ShareO lança em âmbito nacional. UI sem Natal/RN hardcoded (placeholders, Lista VIP, e-mails de fundador, metadados "em todo o Brasil"); depoimentos fictícios com cidades variadas (SP/BH/Curitiba/POA); mapa default centra no Brasil (zoom 4) para usuário sem cidade; /sobre sem o stat "cidade de origem". Seeds (`prisma/seed.ts`, `scripts/seed-demo-items.ts`) espalham itens por 8 capitais. ADR-002 e ADR-015 receberam notas de atualização (premissas geográficas superadas). Cidade real do usuário logado continua exibida normalmente.

**✅ Bugfix crítico — pickupToken no fluxo PIX** (commit `db9397d`, jun/10). O token de retirada só era gerado pelo webhook do Stripe; no fluxo PIX (MVP) o `mark_active` falharia sempre com `TOKEN_REQUIRED`. Agora o token é gerado no `confirm` quando ainda não existe, e o `GET /api/bookings/[id]` retorna o token (locatário exibe o código). Suite nova `e2e/features-jun09.spec.ts`: **16/16 ✅** (token, actualTime, multiplicadores, 3 fotos, taxa dinâmica). booking-flow 5/5 ✅, financeiro 40/40 ✅ (testes defasados corrigidos: 7 cards de métricas, locator de hrefs).

**✅ Crítica de design implementada — 3 prioridades** (commits `e62e8ef`/`8998860`, jun/10). (1) Seed de demonstração: `scripts/seed-demo-items.ts` — 21 itens com fotos Unsplash validadas, 3 por categoria, bairros reais de Natal; listagem deixou de mostrar itens de teste com imagem preta. (2) Detalhe do item mobile: grid com `order` — preço + CTA "Solicitar locação" acima da dobra, antes da descrição. (3) `/ajuda`: guias "Primeiros Passos" em `<details>` fechados por padrão — altura mobile caiu de ~16.100px para ~9.600px (FAQs já tinham accordion+busca via `HelpSearch`).

**✅ Taxa da plataforma 100% dinâmica** (commit `31068af`). Zero hardcodes de "15%" em todo o codebase — sempre lido de `PlatformConfig` via `getPlatformFeeRate()`. Multiplicadores semanal (3×) e mensal (15×) configuráveis pelo SuperAdmin em `/admin/financeiro`. Central de ajuda, calculadoras e todas as páginas de conteúdo atualizam automaticamente quando o SuperAdmin altera a taxa.

**✅ Módulo Financeiro MVP completo.** Fases 0–4 implementadas e deployadas em staging (commit `65cbf67`). Fluxo financeiro ponta-a-ponta: PIX cadastrado → checkout com split → payout automático → four-eyes admin → chargebacks → exportação CSV → informe IR → relatório mensal. Suite E2E financeiro: **33 testes** (suite base: 87 passed). ADRs 012–020 documentados.

**✅ Gestão de admins via UI** (commit `d9b763a`). Tela `/admin/usuarios/admins` exclusiva para SUPERADMIN: criar admins, alterar `adminRole` por dropdown, ativar/desativar — todas as ações auditadas no `AdminLog`. Admins criados nos dois bancos (local + staging): `admin@shareo.com.br` (SUPERADMIN), `financeiro@shareo.com.br` (FINANCEIRO), `operacional@shareo.com.br` (OPERACIONAL).

**✅ Conteúdo pós-módulo financeiro atualizado** (commit `d9b763a`). Central de ajuda, ganhar/page, Seguranca, reservas/sucesso: taxa corrigida para 15%, caução removida do MVP, PIX + hold 3 dias documentados, limite R$ 500, rota real informe IR. Hero: "casa e jardim" → "casa e cozinha".

**✅ Segurança admin hardening (sessão noite jun/05)** — commits `a75c015`→`4148f30`. Nav filtrada por role, guards em todas as rotas admin, blocklist Redis (Edge-compatible), rate limiting, audit log antes/depois, invalidação de sessão pós-troca de senha, formulário inline de senha para admins, tsconfig corrigido, ESLint a11y corrigido, SENTRY_AUTH_TOKEN expirado removido, webhook Vercel reativado via CLI.

**✅ Testes E2E admin** — `e2e/admin-usuarios.spec.ts` — **28 passed / 0 failed / 6 skipped** (por design) contra staging `shareo-rouge.vercel.app`. Sessions fixture: `session-admin.json`, `session-financeiro.json`, `session-operacional.json`.

**✅ Validação manual staging** (05/06/2026) — todos os fluxos validados: login por role, restrições de rota, painel financeiro, exportação CSV, contas PIX, segurança admin, gestão de admins.

**✅ UX admin segregada** (commit `46ea0e6`) — link "Painel Admin" no dropdown/mobile; menu "Anunciar" oculto para admins; seção "Atividade" substituída por atalhos admin; banner upgrade PJ oculto em `/perfil`.

Próximo passo: aplicar migration de embaixadores no staging → deletar scripts temporários → aguardar D4 (jurídico) para go-live em produção.

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
| **Sessão jun/05 tarde** | Gestão de admins via UI, conteúdo central de ajuda corrigido, admins criados em local + staging |
| **Sessão jun/05 noite** | Hardening segurança admin (nav por role, guards, blocklist Redis, rate limit, audit log, senha inline), E2E admin spec, fix build Vercel (Sentry + Edge Runtime + tsconfig + a11y) |
| **Sessão jun/05 tarde/noite 2** | E2E admin 28/0/6 ✅ contra staging, validação manual completa ✅, UX admin segregada (Painel Admin no menu, Anunciar oculto para admins, atalhos admin no dropdown/mobile, banner PJ oculto) |
| **Sessão jun/06** | GitGuardian fix (senhas movidas para env vars, histórico scrubado), id-docs bug fix (getPublicUrl → storage path), security2 25/0/3 ✅, security3 12/12 ✅ (smokes #23-#27), fix crítico: middleware retorna 401 para /api/* sem auth (era 307 redirect) |
| **Sessão jun/09** | Token retirada + endereço anti-golpe, prazo por horário real, repasse segundas, 3 fotos MVP, multiplicadores SuperAdmin, taxa 100% dinâmica, STATUS.md + relatório executivo com arquitetura produção, briefing D4 |
| **Sessão jun/10 manhã** | Bugfix pickupToken PIX (gerado no confirm), fix a11y labels painéis retirada/devolução, e2e/features-jun09 16/16 ✅, crítica de design + 3 prioridades (seed demo 21 itens, detalhe mobile CTA acima da dobra, /ajuda accordion −40% altura), testes defasados corrigidos (financeiro 7 cards, ajuda-plan taxa dinâmica) |
| **Sessão jun/10 tarde/noite** | Verificação de identidade: e-mail de resultado aprovação/rejeição (sendIdVerifiedEmail + sendIdRejectedEmail via Resend), fix upload mobile (removido capture forçado, compressão Canvas client-side máx 4MB), hint câmera na selfie, log detalhado erro Supabase, bucket id-docs criado no staging. Backlog v3.2: item P3 #25 verificação celular Zenvia (decisão Raimundo). Aguarda deploy manual (`npx vercel --prod`) para tester validar. |
| **Sessão jun/11** | Programa de Embaixadores (ADR-022): schema com AmbassadorProfile/Referral/AmbassadorCommission, migration local, lib/ambassador.ts (funções puras), lib/referral.ts reescrito (Referral PENDING em vez de ReferralCredit), webhook Stripe integrado, cron ambassador-decay, /api/ambassador/consent, /perfil/embaixador (painel tier/link/histórico), /admin/embaixadores (métricas + config SuperAdmin). Payout bloqueado (ambassadorPayoutEnabled=false) até D4. Commit 538b7f4. |

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
| E2E Playwright — `e2e/security2.spec.ts` (smokes #18–#22) | ✅ **25 passed / 0 failed / 3 skipped** contra staging |
| E2E Playwright — `e2e/security3.spec.ts` (smokes #23–#27) | ✅ **12 passed / 0 failed / 12 skipped** contra staging |
| `coverageThreshold` — 70% para `pricing`, `crypto`, `bookings` | ✅ Configurado |

---

## Releases

| Tag | Commit | Data | Descrição |
|---|---|---|---|
| `v1.0` | — | pré-v2 | Estado antes da v2 UX |
| `v1.0.0` | `40d1a2b` | 2026-06-04 | Staging validado — ponto de recuperação estável |
| *(candidata)* | `31068af` | 2026-06-09 | Taxa 100% dinâmica + multiplicadores configuráveis + ajuda page v2 — candidata a `v1.1.0` |

---

## Pendências antes de produção

### ✅ P0, P1, P2 — Todos concluídos
### ✅ Módulo Financeiro MVP — Completo

### ⏳ Bloqueadores de produção

| Item | Detalhe |
|---|---|
| **D4 — Consulta jurídica** | Nenhum go-live em produção antes do retorno do jurídico |
| **Supabase production** | Criar 3º projeto Supabase isolado + GitHub environment `production` com Required Reviewers |
| ~~**Validação manual staging financeiro**~~ | ✅ **Concluída** — todos os fluxos validados em 05/06/2026 |

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

---

## Sessões recentes

| Sessão | Destaques |
|---|---|
| **jun/06** | GitGuardian fix (senhas movidas para env vars, histórico scrubado), id-docs bug fix, security2 25/0/3 ✅, security3 12/12 ✅ (smokes #23-#27), fix crítico: middleware retorna 401 para /api/* sem auth |
| **jun/07** | ViaCEP auto-fill endereço, CSP atualizado (`viacep.com.br`), Lighthouse CI smoke #32 ✅ |
| **jun/08** | Logo recortado (sharp) 1254×1254→1216×275, ícone mobile atualizado, taxa plataforma fix `10% → 15%` |
| **jun/09** | Multiplicadores semanal (3×) / mensal (15×) configuráveis SuperAdmin; taxa 100% dinâmica (zero hardcode); ajuda page atualizada (seguro/extravio, indicação, limite R$1.000, precificação 3–5%); fotos MVP limitadas a 3 |

---

## Arquitetura de Produção (planejamento pós-D4)

> Toda esta seção é **planejamento** — nenhuma ação executada antes do sign-off D4.

### Infraestrutura de serviços

| Serviço | Plano atual (staging) | Plano produção | Custo estimado/mês |
|---|---|---|---|
| **Vercel** | Pro (atual) | Pro — necessário para Cron Jobs e Edge Middleware | ~US$20/mês |
| **Supabase (staging)** | Free tier — `fflpuoluiqmhpvcxubqi` | **3º projeto isolado** (sa-east-1) | Free → Pro (~US$25) |
| **Supabase (produção)** | ⏳ Não criado | Pro tier — 8 GB DB, 100 GB Storage, 5M row reads/mês | ~US$25/mês |
| **Upstash Redis** | Pay-as-you-go | Pay-as-you-go (rate limit + blocklist) | ~US$0–5/mês |
| **Resend (e-mail)** | Free (100/dia) | Starter US$20/mês — 50.000 e-mails/mês | ~US$20/mês |
| **Sentry** | Free (5k eventos/mês) | Team US$26/mês se ultrapassar | ~US$0–26/mês |
| **Mapbox** | Free (50k tile requests) | Pay-as-you-go — US$0.50/1.000 requests acima do free | ~US$0–10/mês |
| **Stripe** | Test mode | Live mode — 2.99% + R$0.39 por transação (BR) | % sobre GMV |
| **UptimeRobot** | Free (5 min interval) | Free suficiente para MVP | US$0 |

**Estimativa infra mês 1 produção:** ~US$70–100/mês (≈R$370–530)

### Projetos Supabase — 3 ambientes isolados

| Ambiente | Project ID | Uso |
|---|---|---|
| Local dev | `jtianehxosfdrhjzqvqj` | Desenvolvimento local — dados fictícios |
| Staging | `fflpuoluiqmhpvcxubqi` | Validação CI/CD — dados de fixture |
| **Produção** | ⏳ Criar após D4 | Dados reais de usuários — **nunca misturar** |

**Regra absoluta:** variáveis de env de produção (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET` etc.) **nunca** no `.env`, apenas em GitHub Secrets + Vercel env `production`.

### Variáveis de ambiente por ambiente

| Variável | Local | Staging | Produção |
|---|---|---|---|
| `DATABASE_URL` | Supabase local | Supabase staging | Supabase produção (novo) |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://shareo-rouge.vercel.app` | `https://shareo.com.br` (domínio real) |
| `NEXTAUTH_SECRET` | Qualquer string | Secret staging | Secret produção — **diferente** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token dev | Token staging | Token produção — quota separada |
| `RESEND_API_KEY` | Opcional | Key staging | Key produção |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` — só após D4 |
| `CRON_SECRET` | `shareo-cron-2026` | Staging value | Novo secret produção |
| `ENCRYPTION_KEY` | 64 hex chars | Staging value | **Novo** — rotacionar antes de prod |

### Plano de provisionamento produção (pós-D4)

```
1. Criar Supabase production (sa-east-1, mesmo region do staging)
2. Executar migrations: prisma migrate deploy --schema=prisma/schema.prisma
3. Seed inicial: pnpm db:seed (apenas categorias + PlatformConfig defaults)
4. Criar Vercel project "shareo-production" ou configurar environment "production" no projeto atual
5. Configurar domínio (shareo.com.br ou equivalente) no Vercel
6. GitHub environment "production" com Required Reviewers (mínimo 1 aprovação para deploy)
7. Adicionar todas as variáveis de produção (NUNCA marcar NEXT_PUBLIC_* como Sensitive)
8. Smoke test manual nos fluxos críticos antes de abrir para usuários
9. Ativar Stripe live mode + webhook live endpoint
10. Tag v1.1.0
```

### Limites operacionais do MVP (produção)

| Limite | Valor | Configurável? |
|---|---|---|
| Valor máximo do bem anunciado | R$1.000 por item | SuperAdmin — `maxItemValueCents` |
| Teto por transação | R$500 (`CHECKOUT_MAX_CENTS = 50000`) | `lib/platform-config.ts` |
| Taxa da plataforma (default) | 15% (`DEFAULT_FEE_RATE = 1500` bps) | SuperAdmin via `/admin/financeiro` |
| Multiplicador semanal (sugerido) | 3× a diária | SuperAdmin via `/admin/financeiro` |
| Multiplicador mensal (sugerido) | 15× a diária | SuperAdmin via `/admin/financeiro` |
| Fotos por item | 3 no MVP | Hard-coded `_ItemImageUpload.tsx` |
| Rate limit (default) | 20 req/10s por IP | Upstash Ratelimit |
| Sessão JWT access token | 15 min | `lib/auth.ts` |
| Retenção de dados financeiros | 5 anos | ADR-017 (CTN Art. 173) |
| Cutoff payout semanal | Domingo 23h59 BRT | `/api/cron/payout` toda segunda |

### Licenças de dependências críticas

| Pacote | Versão | Licença | Ponto de atenção |
|---|---|---|---|
| `next` | 15.3.3 | MIT | OK |
| `next-auth` | 5.0.0-beta.31 | ISC | **Beta** — monitorar breaking changes pré-GA |
| `@prisma/client` | 6.7.0 | Apache-2.0 | OK |
| `stripe` | 22.1.1 | MIT | Termos Stripe (2.99% + R$0.39 BR) — verificar com jurídico |
| `mapbox-gl` | 3.3.0 | BSD-3 + Mapbox ToS | Mapbox ToS exige atribuição de marca |
| `react-map-gl` | 7.1.7 | MIT | OK — wrapper sobre mapbox-gl |
| `@supabase/supabase-js` | 2.46.0 | MIT | OK |
| `resend` | 4.0.0 | MIT | ToS Resend — sem spam, opt-out obrigatório |
| `@sentry/nextjs` | 8.14.0 | MIT + Sentry ToS | DSN separado para produção |
| `bcryptjs` | 2.4.3 | MIT | OK |
| `jose` | 5.9.0 | MIT | OK |
| `sharp` | 0.33.4 | Apache-2.0 | OK |
| `lucide-react` | 0.468.0 | ISC | OK |
| `@upstash/ratelimit` | 2.0.8 | MIT | OK |
| `zod` | 3.23.8 | MIT | OK |

**Aviso:** `next-auth` ainda está em beta (v5 beta.31). Antes do go-live em produção, avaliar se há versão estável disponível ou documentar risco aceito.

### Pontos de atenção pré-produção

| # | Item | Risco | Ação |
|---|---|---|---|
| 1 | **D4 — Jurídico** | Bloqueador total | Aguardar sign-off formal |
| 2 | **Stripe live mode** | Financeiro | Ativar apenas após D4; verificar KYC Stripe BR |
| 3 | **NextAuth v5 beta** | Técnico médio | Checar changelog antes do go-live; planejar migração se sair GA com breaking changes |
| 4 | **RLS desabilitado** | Segurança | Compensado por guards server-side; documentar e revisar com jurídico (LGPD) |
| 5 | **ENCRYPTION_KEY rotação** | Segurança | Gerar nova key para produção — dados criptografados em staging são ilegíveis em prod (esperado) |
| 6 | **Mapbox ToS atribuição** | Legal | Footer/mapa deve exibir "© Mapbox © OpenStreetMap" |
| 7 | **Resend domínio verificado** | E-mail | Configurar SPF/DKIM para `@shareo.com.br` antes de enviar e-mails transacionais |
| 8 | **Scripts temporários** | Segurança | Deletar 6 scripts antes de qualquer go-live (listados abaixo) |
| 9 | **Supabase Storage buckets** | Ops | Criar buckets `item-images`, `booking-photos`, `id-docs` no projeto produção |
| 10 | **Cron secrets distintos** | Segurança | `CRON_SECRET` produção deve ser diferente do staging |

### Scripts temporários a deletar antes de produção

```
scripts/reset-fixture-pwd.ts
scripts/delete-e2e-admins.ts
scripts/clear-rl.mjs
scripts/fix-admin-roles.ts
scripts/set-fixture-admin-role.ts
scripts/verify-admin-sessions.ts
```
