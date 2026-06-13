# Backlog de Atividades Priorizadas — ShareO

**Versão:** 3.7  
**Atualizado em:** 2026-06-13 (sessão 13 — auditoria crítica multi-aspecto delegada: QA/E2E + Segurança + Arquitetura, read-only, para deliberação)  
**Responsável:** Roberto Epifânio

> Verificação feita diretamente no código — cada item foi confirmado por arquivo/componente.

---

## 🔬 Auditoria Crítica s13 (2026-06-13) — PARA DELIBERAÇÃO COM O FUNDADOR

> Auditoria multi-aspecto delegada a 3 subagentes em paralelo (`qa-shareo`, `seguranca-shareo`, `arquiteto-shareo`) sobre o commit `14c51f2`.
> **READ-ONLY — nenhum código/spec/config foi alterado.** Todos os itens aguardam deliberação antes de qualquer ação. NÃO re-reporta QA-01/QA-14 (resolvidos na s12).
> **Run E2E:** 248✅ / 9❌ / 19skip (7m30s, chromium serial). Evidência bruta: `docs/auditoria-critica-2026-06-13-qa.txt`.
> **Postura de segurança:** base SÓLIDA — guards `ownerId === session.user.id → 403` consistentes em 30+ rotas (tese do ADR-009 validada; nenhum IDOR explorável em GET/PATCH de bookings/items/users). **Arquitetura:** nota **A−** (disciplina de `after()`, `PlatformConfig` e CSP-com-nonce confirmadas).
> IDs: `SEC-*` segurança · `ARQ-*` arquitetura · `QA-*` qa/e2e. ⊕ = item deduplicado (mesmo achado por +1 eixo).
> ⚠️ Achados são reportados como os subagentes os classificaram. O orquestrador NÃO os reverificou linha-a-linha — ver "Notas do orquestrador" ao final para confiança e ordem sugerida de verificação.

### 🔴 CRITICAL — deliberar primeiro

| ID | Achado | Local | Risco |
|---|---|---|---|
| **SEC-CRIT-01** ✅verificado | Cron routes "abrem por padrão" se `CRON_SECRET` vazio: `if (secret && auth !== Bearer secret)` curto-circuita p/ false quando secret undefined/"" → rota fica **pública**. CONFIRMADO em `reminders/route.ts:36` | 6 rotas `app/api/cron/*` | Disparar cobranças Stripe late fee, cancelar reservas, marcar payout PROCESSING, e-mail em massa. **Correção ao agente:** `middleware.ts:99` na verdade FALHA-FECHADO (bypass só com secret presente) — NÃO é vulnerável. 2 crons (ambassador-decay, reengagement) já usam a forma estrita |
| **SEC-CRIT-02** | `CRON_SECRET` real (`shareo-cron-2026`) versionado em texto claro | `CLAUDE.md:53`, `docs/STATUS.md:252`, `e2e/cron.spec.ts:16` | Combinado com SEC-CRIT-01, qualquer um com acesso ao repo aciona todos os crons de staging. Rotacionar + usar `process.env` nos specs |
| ~~**SEC-CRIT-03**~~ ❌**REFUTADO** | Falso positivo. O agente alegou "login web sem rate limit / `loginIp`/`loginEmail` código morto", mas há um wrapper que intercepta o POST do NextAuth e aplica rate limit em `/callback/credentials` (**10/min por IP + 5/5min por e-mail**). O agente grepou só `lib/auth.ts` e não viu o wrapper | `app/api/auth/[...nextauth]/route.ts:14-40` | **Sem risco — login web ESTÁ protegido contra brute force.** Removido dos pendentes |
| **SEC-CRIT-04** ⚠️ | Invalidação de sessão pós-troca de senha **NÃO implementada** — porém `STATUS.md:49` afirma como entregue (**divergência doc×código**). Sem `passwordChangedAt`/bump de sessionVersion/blocklist | `app/api/user/password/route.ts:42-46`, `lib/auth.ts:50-58` | Sessão JWT comprometida sobrevive até 24h após a vítima trocar senha. Idem mudança de e-mail |
| **SEC-CRIT-05** ✅verificado | Upload de fotos de booking: guard só checa participante, **zero validação de `status`** e **nenhum check de MIME/magic-bytes** (nem content-type — só tamanho) | `app/api/bookings/[id]/photos/route.ts:48-117` | Subir fotos CHECKOUT fora de fase / após COMPLETED → envenenar histórico p/ fraude em disputa. Exige ser participante do booking (severidade real mais p/ Major que Critical) |
| ~~**SEC-CRIT-06**~~ ⬇️**rebaixado p/ Minor** | Exclusão de imagem sem validar prefixo do path. **Verificado:** o guard de propriedade (`ownerId !== session.user.id → 403`, linha 202) já protege e `image.url` é server-controlled → apenas defesa-em-profundidade, não explorável | `app/api/items/[id]/images/route.ts:202,211` | Baixo |
| **ARQ-A-01** | **Estratégia de render divergiu do ADR-007**: `/itens`, `/itens/[id]`, `/loja/[slug]`, `/perfil/[id]`, `/sobre` são SSR puro (`auth()` no topo força dynamic); zero ISR/SSG; `/categoria/[slug]` prometida não existe | múltiplas páginas + `app/sitemap.ts` | SEO orgânico capado + custo lambda linear ao crawl + LCP mobile pior em escala. **Decisão estratégica sua** |
| **ARQ-A-02** | Regressão de `after()`: `prisma.item.update({viewCount:+1}).catch()` solto após o return da Server Component | `app/itens/[id]/page.tsx:164` | viewCount subdimensionado em prod (afeta sort "Mais alugados" e o futuro `generateStaticParams`); silencioso. Classe de bug que o CLAUDE.md alerta |
| **ARQ-A-03** ⊕ **QA-BUG-06** | `BASE_URL` não propaga p/ 13 specs no run completo (`?? 'http://localhost:3000'`) → ~14 falhas mascaradas/falsos-positivos; sumário reporta MENOS falhas do que há | `playwright.staging.config.ts` + 13 specs | Ruído mascara bugs reais; gate de release vira permissivo por hábito ("é só o BASE_URL de novo") |

### 🟠 MAJOR

| ID | Achado | Local | Risco/Nota |
|---|---|---|---|
| **SEC-MAJ-02** | `/api/upload` (genérico, usado por `/itens/novo`) aceita `application/octet-stream` sem magic-bytes | `app/api/upload/route.ts:24-26` | Payload arbitrário em bucket público com URL `*.supabase.co` → phishing/malware. `items/[id]/images` já valida certo — alinhar |
| **SEC-MAJ-03** | Upload de doc de identidade (CPF/RG/selfie) sem whitelist MIME nem magic-bytes; contentType vem do cliente | `app/api/users/me/id-verification/route.ts:55-63` | XSS no painel admin via signed URL (SVG/HTML como "documento"). Comprometimento de admin = jackpot |
| **SEC-MAJ-04** | `pnpm audit --prod`: 2 High (`rollup` path-traversal, `esbuild` RCE), 2 Moderate (`postcss`, `uuid`), 1 Low (`cookie`<0.7 via `@supabase/ssr` — path de sessão) | `pnpm-lock.yaml` | rollup/esbuild são build-time; `cookie` e `postcss` runtime. Atualizar `@sentry/nextjs` + `@supabase/ssr` |
| **SEC-MAJ-05** ⊕ **ARQ-M-02** | NextAuth **v5.0.0-beta.31** em produção, sem ADR de risco nem plano de migração GA (changelog v5 já trocou cookies/callbacks) | `package.json`, `lib/auth.ts` | Auth é caminho crítico; beta sem garantia de patch de segurança. Criar ADR-023 (versão alvo, gatilho, soak) |
| **SEC-MAJ-06** ⚠️LGPD | DELETE de conta anonimiza nome/e-mail/CPF mas **não** `borrowerNote/ownerNote/Review.comment/Message.content/OwnerPaymentAccount(PIX)/IDVerification.idDocumentUrl+selfie` | `app/api/users/me/route.ts:90-114` | Manter doc de identidade + PIX após exclusão viola LGPD art.18 (multa ANPD). Jurídico (D4) vai cobrar |
| **SEC-MAJ-07** | Bypass global de rate limit: `SKIP_RATE_LIMIT=true` e `E2E_SECRET`+header `x-e2e-token` desligam TUDO; workflows setam `SKIP_RATE_LIMIT=true` | `lib/rateLimit.ts:94-100`, `.github/workflows/*` | Se a env vazar p/ Vercel prod, rate limits caem silenciosamente. Condicionar a `NODE_ENV !== production` |
| **SEC-MAJ-09** | `pickupToken` (6 dígitos, controle anti-fraude da retirada) gerado com `Math.random()` (PRNG não-cripto) | `app/api/webhooks/stripe/route.ts:99-105`, `app/api/bookings/[id]/route.ts:262-268` | Previsão sequencial → "ativar" reserva alheia. Trocar por `crypto.randomInt(100000,1000000)` |
| **QA-BUG-04** ⚠️app | `POST /api/auth/resend-verification` retorna **400 ALREADY_VERIFIED** quando e-mail já verificado — deveria ser **409** (RFC 7231 estado de recurso). Spec também tem assert invertido | `app/api/auth/resend-verification/route.ts:37-41` | Client que trata 400 como erro de input mostra mensagem genérica. **Único achado de semântica de API app-side novo do QA** |
| **ARQ-M-01** | Filtro de distância carrega **TODOS os itens AVAILABLE em memória** (Haversine em JS; sem PostGIS — `geom` comentado no schema) | `app/itens/page.tsx:122-127` | O(n) RAM+CPU; 27 itens OK, 50k explode (timeout mobile). LCP da rota de maior conversão. Resolver hoje = horas; depois = reescrita |
| **ARQ-M-03** | `SessionProvider` (client) envolve a árvore inteira no root layout — hidrata até `/sobre` | `components/layout/Providers.tsx`, `app/layout.tsx:95` | Bundle inflado em páginas públicas; degrada LCP. Mover p/ layout de rotas autenticadas ou passar session via prop aos 3 leafs |
| **ARQ-M-04 / M-05** | `Item.slug` e `Category.slug` existem no schema (índice + "SEO URL") mas URLs usam `id` (cuid); `/categoria/[slug]` (ADR-007) não existe | `schema.prisma:311,331`, `app/sitemap.ts` | SEO long-tail enfraquecido; habilitar slugs depois = 301 em massa (perda temporária de PageRank). Decidir antes de prod |
| **ARQ-M-06** | `getPlatformFeeRate()` e as 10+ helpers de `PlatformConfig` fazem `findUnique` **a cada request** — zero `unstable_cache`/`React.cache` | `lib/platform-config.ts` | Round-trip ao Postgres por request no caminho crítico (item/booking/webhook) p/ valor que muda ~1×/mês |
| **ARQ-M-07** | `GET /api/items/[id]` usa `include` amplo + `images` sem `take` (carrega todas as fotos) | `app/api/items/[id]/route.ts:17-40` | Payload 50–200KB; cresce com upload. Server Component equivalente já usa `select` granular |
| **ARQ-M-08** | Paginação dupla `useJsFilter ? slice : raw` frágil a refactor (invariante não-óbvio) | `app/itens/page.tsx:184-187` | Bug latente (count errado/itens duplicados). Extrair p/ função pura testada |
| **QA-BUG-01** | Cobertura: smoke #21 não passa `pickupToken` no `mark_active` → fluxo de **avaliação pós-locação fica sem cobertura real** (app correto ao exigir token) | `e2e/security2.spec.ts:224` | Regressão em reviews passaria invisível. Spec deve buscar token como `review.spec.ts:44-48` |

### 🟡 MINOR (backlog — baixo risco residual)

| ID | Achado | Local |
|---|---|---|
| **SEC-MIN-05** ❗⬆️**CONFIRMADO — SOBE p/ MAJOR/CRITICAL** | **Stored XSS público confirmado.** `item.title`/`description`/`owner.name` entram em `productJsonLd`+`breadcrumbJsonLd` via `dangerouslySetInnerHTML`+`JSON.stringify` (não escapa `</script>`) E a validação do título é **só length** (`item.ts:10-11`, sem stripHtml/sanitize). Título `</script><script>…` (≤120 ch) executa em **todo visitante** da página do item | `app/itens/[id]/page.tsx:208-254` + `lib/validations/item.ts:10-11` |
| **SEC-MIN-06** ✅confirmado (considerar MAJOR) | `GET /api/items` (público) retorna `latitude/longitude` **exatos** (linhas 63-64) — vaza endereço do dono apesar da UI mostrar só bairro. Privacidade/segurança física + LGPD | `app/api/items/route.ts:63-64` |
| **SEC-MIN-01** | Faltam headers `Cross-Origin-*` e CSP `frame-ancestors 'none'` | `next.config.ts:7-17`, `middleware.ts:35-61` |
| **SEC-MIN-02** | `/api/auth/verify-email` é GET com side-effect (CSRF-friendly; mitigado por token único 32B) | `app/api/auth/verify-email/route.ts` |
| **SEC-MIN-09** | Mobile JWT sem rotação de refresh, sem blocklist, sem `jti` — device roubado válido por 30d | `app/api/auth/mobile/login/route.ts`, `refresh/route.ts` |
| **SEC-MIN-10** | `/api/admin/disputes/[id]` checa só `role==="ADMIN"`, não `requireAdminRole` granular | `app/api/admin/disputes/[id]/route.ts:17` |
| **SEC-MIN-11** | `prisma/seed.ts` loga senha admin em texto claro; sem guard `NODE_ENV!=="production"` | `prisma/seed.ts:163,182` |
| **SEC-MIN-03/04/07/08** | IP em claro no contract (export LGPD não inclui); `stripHtml` simplista no chat; `/founders/leads` sem unsubscribe; `viewCount` sem rate-limit | (ver relatório) |
| **LGPD-01/02/03** | `consentVersion` hardcoded sem catálogo/re-consentimento; UUID retido no Sentry; sem `ConsentLog` (histórico de consentimento) | múltiplos |
| **ARQ-Mi-01** | 6+ primitivos UI com `"use client"` desnecessário (`Button`, `ShareOLogo` sem hooks) — bundle inflado | `components/ui/*` |
| **ARQ-Mi-08** | `geocodeUserLocation` é `await` (não `after()`) no `PATCH /me` → form espera Mapbox 3–5s | `app/api/users/me/route.ts:228,235` |
| **ARQ-Mi-10** | Detalhe do item faz 3 `booking.count` que poderiam ser 1 `groupBy` | `app/itens/[id]/page.tsx:118-139` |
| **ARQ-Mi-11** | `lib/rateLimit.ts` usa SDK `@upstash/redis` (Node-only) — quebra se rota virar Edge | `lib/rateLimit.ts:10` |
| **ARQ-Mi-02/03/04/05/06/07/09/12** | 2 fontes p/ APP_URL; `bodyParser:false` morto no webhook; `app/(admin)/` órfão; `@tanstack/react-query` no bundle web sem caller; polling client em 3 componentes booking; duplicata `"natal/rn"` em CITY_COORDS; TODOs sem owner; hook `useChat` legado morto | (ver relatório) |

### 📊 Gaps de cobertura E2E (fluxos implementados, zero teste automatizado)

| ID | Fluxo sem cobertura | Local | Risco |
|---|---|---|---|
| **QA-GAP-01** | **Cupons** (aplicar válido/inválido/expirado/race `COUPON_RACE`) | `lib/coupons.ts`, `POST /api/bookings` | Regressão em desconto/concorrência invisível |
| **QA-GAP-02** | **Embaixadores** (consent, painel `/perfil/embaixador`, tier, link, payout bloqueado) | `app/perfil/embaixador/`, `/api/ambassador/consent` | Painel com dado errado passa ao go-live |
| **QA-GAP-03** | **Extensão de prazo** bilateral (solicitar/aprovar/recusar + banner) | `app/api/bookings/[id]/extend/route.ts` | Fluxo de gestão de locação ativa sem validação |
| **QA-GAP-04** | **Disputa** ponta-a-ponta (abrir → admin vê → resolve) — só webhook coberto | `bookings/[id]/dispute`, `admin/disputes/[id]` | Mecanismo central de confiança sem E2E |
| **QA-GAP-05** | **JWT refresh / sessão 15min** (expira durante ação, refresh transparente) | `lib/auth.ts` | Usuário 15min+ no checkout pode ter erro silencioso → abandono |
| **QA-GAP-07** | **Fotos de devolução** (upload pré/pós-locação) | `bookings/[id]/photos` | Crítico p/ disputa; regressão invisível |
| **QA-GAP-06/08/09/10** | Sugestão de preço no form; auth mobile; founder leads; `PATCH /notifications/[id]/read` (badge do sino) | (ver relatório) | Menor |

### Notas do orquestrador (dedup, confiança, próximos passos)

- **Deduplicação aplicada:** NextAuth beta = SEC-MAJ-05 ⊕ ARQ-M-02 (1 item). BASE_URL = ARQ-A-03 ⊕ QA-BUG-06 (1 item) e já era conhecido (QA-02..13/24/25 da s11). Locators de auth do QA (**QA-BUG-02 logout**, **QA-BUG-03 callbackUrl**) **confirmam** os já-catalogados QA-03/QA-04 (bug no spec, app OK) — QA-BUG-03 adiciona nota a11y: `aria-label="Mostrar senha"` do toggle gera ambiguidade semântica. **QA-BUG-05** (admin 429) = QA-23 já catalogado.
- **O que é genuinamente novo e app-side (não infra de teste):** toda a coluna SEC-* (segurança), todo ARQ-* exceto A-03, e **QA-BUG-04** (400 vs 409). O resto dos "bugs" do QA são confirmações de itens de infra de teste já conhecidos — o valor do QA aqui foi **mapear os 10 gaps de cobertura** acima.
- **Verificações já feitas pelo orquestrador (read-only, 2026-06-13):**
  - ✅ **SEC-CRIT-01 CONFIRMADO** — `reminders/route.ts:36` falha-aberto se `CRON_SECRET` vazio. (Mas `middleware.ts:99` falha-FECHADO — corrigido na tabela.)
  - ✅ **SEC-CRIT-02 CONFIRMADO** — `CRON_SECRET=shareo-cron-2026` está em texto claro no CLAUDE.md.
  - ❌ **SEC-CRIT-03 REFUTADO** — login web tem rate limit (wrapper `[...nextauth]/route.ts`). Era falso positivo.
  - ✅ **SEC-CRIT-04 CONFIRMADO** — `grep passwordChangedAt` = 0 ocorrências ⇒ invalidação de sessão pós-senha realmente não existe (diverge do STATUS.md:49).
  - ✅ **SEC-CRIT-05 CONFIRMADO** — sem status nem MIME check (só participante + tamanho).
  - ⬇️ **SEC-CRIT-06 REBAIXADO p/ Minor** — guard de propriedade já protege; só defesa-em-profundidade.
  - ❗ **SEC-MIN-05 CONFIRMADO e SOBE p/ MAJOR/CRITICAL** — stored XSS público REAL: título não sanitizado (só length) flui p/ JSON-LD via `dangerouslySetInnerHTML`. **Provavelmente o achado mais sério da auditoria** e estava como "Minor".
  - ✅ **SEC-MIN-06 CONFIRMADO** — lat/lng exatos no GET público; considerar MAJOR (privacidade/segurança física + LGPD).
  - ⏳ **Ainda NÃO reverificados (hipóteses até confirmar):** SEC-MAJ-02/03/04/07/09, QA-BUG-04 e os ARQ-* além de A-01/A-02/A-03. O caso SEC-CRIT-03 (refutado) mostra que os subagentes erram por grep estreito — **não tratar severidade não-verificada como fato**.
- **Estratégicas (decisão sua, não "bug"):** ARQ-A-01 (ADR-007 ISR/SSG), ARQ-M-04/05 (slugs e `/categoria`), SEC-MAJ-05⊕ARQ-M-02 (NextAuth beta).
- **Bloqueador D4:** SEC-MAJ-06 + LGPD-01/03 são exatamente o que o jurídico vai cobrar — antecipar no dossiê da consulta.
- **Nada foi corrigido.** Aguardando sua deliberação sobre o que vira P0/P1/P2 e o que é aceito como risco.

---

## ✅ Concluídos (confirmados no código)

| Item | Evidência no código |
|---|---|
| `coverageThreshold` 70% nos módulos críticos | `jest.config.ts:50` |
| Testes unitários: `bookings`, `pricing`, `crypto`, `auth`, `rateLimit`, `middleware`, `haversine`, `co2`, `format`, `geo` | `__tests__/unit/` |
| Testes de integração: `bookings/patch`, `bookings/reviews`, `auth/register`, `conversations/messages`, `items/get/post/patch` | `__tests__/integration/` |
| Testes E2E: `auth`, `booking-flow`, `navigation`, `search-filter`, `admin`, `chat`, `favorites`, `responsive`, `error-pages`, `anuncio`, `review` | `e2e/` |
| Páginas 404 e 500 com design ShareO | `app/not-found.tsx`, `app/error.tsx` |
| Empty states em todas as páginas (inline com ícone + mensagem + CTA) | `/itens`, `/reservas`, `/mensagens`, `MyItemsGrid` |
| Política de cancelamento (lógica + exibição na UI) | `lib/cancellationPolicy.ts`, `app/itens/[id]/page.tsx` |
| Calendário de disponibilidade na página do item | `components/items/AvailabilityCalendar` + `app/itens/[id]/page.tsx:331` |
| Código da reserva + tela "Aguardando Confirmação" com countdown | `app/reservas/[id]/aguardando/`, `app/reservas/sucesso/` |
| Chips de filtros ativos com X para remover | `app/itens/_ActiveFilterChips.tsx` |
| `sitemap.ts` e `robots.ts` | `app/sitemap.ts`, `app/robots.ts` |
| Recuperação de senha | `app/(auth)/esqueci-senha/` |
| Exclusão de conta (LGPD) | `app/perfil/seguranca/` |
| Área de perfil completa (7 sub-páginas) | `app/perfil/*` |
| Filtro bottom sheet (mobile) | `components/items/FilterBottomSheet.tsx` |
| Pull to refresh (mobile) | `components/items/PullToRefresh.tsx` |
| CI/CD GitHub Actions | `.github/workflows/ci.yml` |
| Sentry configurado | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Rate limiting in-memory | `lib/rateLimit.ts` |
| Nav reestruturada (Início/Explorar/Anunciar dropdowns + MobileMenu expansível) | `components/layout/` |
| Taxa de resposta do proprietário + contagem de locações na página do item | `app/itens/[id]/page.tsx:109–129, 531–549` |
| Breadcrumb visual + JSON-LD na página do item | `app/itens/[id]/page.tsx:172, 257` |
| Seção "Itens similares" na página do item | `app/itens/[id]/page.tsx:132, 609` |
| Timeout automático de reserva (PENDING → cancelado em 2h via cron) | `app/api/cron/expire-bookings/route.ts` |
| E-mails de reengajamento pós-aluguel (1d, 7d, 30d) | `app/api/cron/reengagement/route.ts` |
| Extensão de prazo — API completa (locatário solicita / proprietário aprova ou recusa) | `app/api/bookings/[id]/extend/route.ts` |
| Abertura de disputa com motivo em texto | `_BookingActions.tsx` — botão "Abrir disputa" + textarea |

---

## QA E2E — Delta Sessão 11 (2026-06-13)

> Sessão 11: regeneração de fixtures + rerrodada completa da suíte staging.  
> Resultado: **224 passou / 30 falhou / 19 skip / 3 flaky** (276 testes, 8m40s, chromium, serial).  
> Baseline sessão 10: 227 passou / 28 falhou / 19 skip / 2 flaky.  
> Nenhum código de produção foi alterado nesta sessão (confirmado via `git diff --name-only`).  
>  
> **Causa raiz dual identificada:** (1) Sessões fixture expiradas — endereçado: fixtures locatário/proprietário/admin regenerados 2026-06-13 08:11. (2) `BASE_URL` não definido ao rodar `playwright test --config=playwright.staging.config.ts` — 13 specs usam `process.env.BASE_URL ?? 'http://localhost:3000'` e fazem requests API para localhost em vez do staging. Esta é causa persistente independente de fixtures.  
>  
> **Novo achado revelado pós-fixture:** QA-23 (admin-usuarios rate limit 429), QA-24 (smoke #19/#30 BASE_URL), QA-25 (auth seletores imprecisos) — ver seção P2 abaixo.

## QA E2E — Achados Sessão 10 (2026-06-13)

> Identificados durante execução E2E completa: suíte local (4 projetos, 45 specs) + suíte staging (276 testes, 1 worker).  
> Nenhum código de produção foi alterado nesta sessão.

### P1 — Necessários antes do MVP público

| # | Spec / Rota | Achado | Bug report resumido |
|---|---|---|---|
| QA-01 | `e2e-a11y-plan.spec.ts` / `/` e outras páginas públicas | **[PERSISTE — BUG FUNCIONAL]** 3 violações WCAG AA de contraste (serious) detectadas pelo axe-core em staging. Seletores: `.text-white\/50`, `.mt-5` (2 ocorrências). Reproduzível em 2/2 tentativas mesmo com fixture válido. Delta s11: falha confirmada novamente com mensagem idêntica. | TÍTULO: [Homepage/páginas públicas] — 3 violações WCAG AA color-contrast (serious) em staging — `.text-white\/50`, `.mt-5` · CRITICIDADE: Critical · AMBIENTE: https://shareo-rouge.vercel.app · PASSOS: 1. Acessar `/` ou páginas públicas · OBSERVADO: axe-core reporta `.text-white\/50` e 2× `.mt-5` com contraste insuficiente · ESPERADO: contraste mínimo 4,5:1 (texto normal) conforme WCAG 1.4.3 AA · EVIDÊNCIA: `e2e/e2e-a11y-plan.spec.ts:213` |
| QA-02 | `security5.spec.ts` / `PATCH /api/users/me` | **[PERSISTE — BASE_URL ausente]** Causa real: `security5.spec.ts` usa `BASE = process.env.BASE_URL ?? 'http://localhost:3000'`. Ao rodar staging sem `BASE_URL`, os requests API vão para localhost:3000. Fixture foi regenerado (não é mais sessão expirada), mas o spec continua falhando pela mesma razão sistêmica. Delta s11: a mesma falha (smoke #30, #31 também) confirmada em `security5.spec.ts:191, :215, :305`. | CORREÇÃO: passar `BASE_URL=https://shareo-rouge.vercel.app` no comando de staging ou definir em `playwright.staging.config.ts` via `process.env.BASE_URL`. |
| QA-03 | `auth.spec.ts` / `/dashboard` logout | **[PERSISTE — BUG NO SPEC]** Com fixture válido a sessão carrega corretamente (dashboard renderiza "Olá, Joana!"). O locator `getByRole('button', {name: /perfil|conta|avatar/i})` não encontra o botão real "Menu do usuário — Joana" (texto diferente do esperado). O dropdown não abre, portanto o botão "Sair" não aparece. Não é problema do app — é locator impreciso no spec. Delta s11: confirmado, mesmo erro. | CORREÇÃO: atualizar spec para `getByRole('button', {name: /menu do usuário|Joana/i})` ou usar `button[aria-label*="Menu"]`. |
| QA-04 | `auth.spec.ts` / `/login?callbackUrl=%2Fdashboard` | **[PERSISTE — BUG NO SPEC]** `getByLabel(/senha/i)` resolve para 2 elementos: input de senha + botão "Mostrar senha". Strict mode violation. Não é falha do app. Delta s11: confirmado, `locator.fill Error: strict mode violation`. | CORREÇÃO: usar `page.locator('#password').fill(...)` (ID exclusivo). |
| QA-05 | `security4.spec.ts` / `POST /api/payments/checkout` | **[PERSISTE — BASE_URL ausente + Stripe não configurado]** 4 sub-testes falham: smoke #28 `security4.spec.ts:56, :97, :136, :217`. Com fixture válido os requests chegam ao localhost:3000 (sem servidor) via `BASE = process.env.BASE_URL`. Adicionalmente, mesmo que `BASE_URL` fosse corrigido, Stripe em staging pode não ter `STRIPE_SECRET_KEY` configurado. Delta s11: 4 falhas confirmadas. | CORREÇÃO prioritária: adicionar `BASE_URL` ao comando/config de staging. Secundária: verificar `STRIPE_SECRET_KEY` no Vercel env. |
| QA-06 | `security2.spec.ts:183` / review flow smoke #21 | **[PERSISTE — BUG FUNCIONAL]** POST review retornou `422` (Unprocessable Entity), não `BASE_URL`. O request chegou ao servidor mas foi rejeitado — provavelmente porque o booking fixture no staging não está em estado COMPLETED/RETURNED para permitir review. Estado de DB inconsistente entre runs. Delta s11: `Expected: 201, Received: 422`. | TÍTULO: [Review flow] — smoke #21 booking não está em estado COMPLETED no staging: POST review retorna 422 · CRITICIDADE: Major |
| QA-07 | `security3.spec.ts:238` / `GET /api/users/me/export` | **[PERSISTE — BASE_URL ausente]** Request vai para localhost:3000 via `BASE = process.env.BASE_URL ?? 'http://localhost:3000'`. Com fixture válido a sessão está ok, mas o endpoint não é chamado no staging. Delta s11: confirmado como falha (status inesperado). | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-08 | `security3.spec.ts:285` / `PATCH /api/admin/payouts` | **[PERSISTE — BASE_URL ausente]** Mesmo padrão. `security3.spec.ts` usa `BASE`. Delta s11: confirmado como falha. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-09 | `security3.spec.ts:117` / `POST /api/admin/export` | **[PERSISTE — BASE_URL ausente]** Request vai para localhost:3000. Delta s11: `Expected: 200, Received: 401`. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-10 | `profile-edit.spec.ts:44` e `:75` | **[PERSISTE — BASE_URL ausente]** GET/PATCH `/api/users/me` vão para localhost:3000. Fixture regenerado funcionou (login e sessão estão válidos), mas o spec faz requests diretos via `BASE`. Delta s11: `GET /api/users/me deve ser 200 → false` e `Cannot read properties of undefined (reading 'name')`. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-11 | `email-verification.spec.ts:79` | **[PERSISTE — BASE_URL ausente]** `email-verification.spec.ts` usa `BASE`. POST para localhost:3000 retorna conexão recusada interpretada como 401. Delta s11: `Expected value: 401, Received array: [200, 409, 429]` — o assert toContain recebeu 401 (localhost sem servidor). | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-12 | `id-verification.spec.ts:52` e `:84` | **[PERSISTE — BASE_URL ausente]** Requests para localhost:3000. Delta s11: 2 sub-testes falham (`Expected: [400, 409], Received: 401`). | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-13 | `notifications.spec.ts:41` e `:66` | **[PERSISTE — BASE_URL ausente]** `notifications.spec.ts` usa `BASE`. Delta s11: 2 sub-testes falham. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-14 | `phone-verification.spec.ts:33` e `:130` | **[PERSISTE — BUG FUNCIONAL + BASE_URL ausente]** Teste 1 (sem auth): retornou `400` em vez de `401` — bug real no endpoint `/api/auth/phone/send-otp` que responde `400` antes de verificar auth. Teste 4 (campo phone): `BASE_URL` ausente. Delta s11: `Expected: 401, Received: 400` para teste 1. | TÍTULO: [Phone OTP] — `/api/auth/phone/send-otp` retorna 400 para request não autenticado, deveria retornar 401 · CRITICIDADE: Major · Correção para teste 4: `BASE_URL`. |

### P2 — Polimento / Infra de testes

| # | Spec / Rota | Achado | Detalhe |
|---|---|---|---|
| QA-15 | `responsive.spec.ts` / `/itens` | **Página /itens timeout 30s no servidor local** (chromium). A página não carrega em 30s no ambiente local. Pode indicar consulta lenta ao banco local de dev (Supabase local não configurado), SSR pesado ou query não indexada. Não é regressão em staging. | TÍTULO: [/itens] — timeout 30s no servidor local (chromium + tablet) · CRITICIDADE: Minor (ambiente local apenas) · AMBIENTE: localhost:3000 · PASSOS: 1. `pnpm dev` · 2. `page.goto('/itens')` · OBSERVADO: timeout após 30s · ESPERADO: carga em < 10s · EVIDÊNCIA: `e2e/responsive.spec.ts:47` |
| QA-16 | `pricecalc.spec.ts:146` | **Teste 5 (tabs ausentes) falha localmente** porque `/api/items` retorna lista vazia (banco local sem seed) — `dailyOnlyItem` é undefined. O teste deveria fazer early return com annotation mas pode estar falhando por outro motivo. Verificar se o early return está funcionando. | TÍTULO: [PriceCalc #5] — falha local por banco sem seed: `dailyOnlyItem` undefined sem early return correto · CRITICIDADE: Minor (infra local) · EVIDÊNCIA: `e2e/pricecalc.spec.ts:151-155` |
| QA-17 | `pricecalc.spec.ts:223` | **Teste 8 (preservar data ao trocar modo) falha localmente** — mesmo motivo do QA-16: `multiItem` undefined por banco local sem dados. O early return com annotation deveria evitar a falha mas o spec falha. | TÍTULO: [PriceCalc #8] — falha local por banco sem seed · CRITICIDADE: Minor · EVIDÊNCIA: `e2e/pricecalc.spec.ts:228-232` |
| QA-18 | `pricecalc.spec.ts:263` | **Teste 11 (teto R$500) falha localmente** — sem itens no banco local o teste não pode avançar. | TÍTULO: [PriceCalc #11] — falha local por banco sem seed · CRITICIDADE: Minor · EVIDÊNCIA: `e2e/pricecalc.spec.ts:268` |
| QA-19 | `pricecalc.spec.ts:329` | **Teste 10 (link /login para não logados) falha localmente** — sem itens disponíveis no banco local o spec falha ao tentar navegar para a página do item. | TÍTULO: [PriceCalc #10] — falha local por banco sem seed · CRITICIDADE: Minor · EVIDÊNCIA: `e2e/pricecalc.spec.ts:333` |
| QA-20 | `navigation.spec.ts` (8 falhas) · `error-pages.spec.ts` (2 falhas) · `mobile-menu-close.spec.ts` (2 falhas) · `mapbox.spec.ts` (2 falhas) | **Falhas locais em cadeia por timeout de /itens ou ausência de items no DB local.** A maioria dos specs de navegação que tentam acessar `/itens` ou navegar para detalhe de item falham por timeout ou por não encontrarem links de item. Causa raiz: servidor local sem dados seed + possível lentidão de compilação turbopack na primeira requisição. | TÍTULO: [Navegação/Responsividade local] — 14 specs falham no local por timeout em /itens ou ausência de itens no DB · CRITICIDADE: Minor (ambiente local) · CAUSA RAIZ: banco de dev local sem seed / timeout de cold-start turbopack · EVIDÊNCIA: `e2e/navigation.spec.ts`, `e2e/error-pages.spec.ts`, `e2e/mobile-menu-close.spec.ts`, `e2e/mapbox.spec.ts` |
| QA-21 | `double-booking.spec.ts:46` | **[PERSISTE — FLAKY / ESTADO DE DB]** Delta s11: smoke #10A e #10B ambos marcados como `flaky` (3 flaky total). O item no staging tem bookings pré-existentes que interferem com a criação de novo booking. O locatário "não consegue criar PENDING" (`expect.toBeTruthy() → false`) porque o item fixture pode estar sem disponibilidade. Race condition ou estado de DB contaminado. | TÍTULO: [double-booking] — smokes #10A #10B flaky: item fixture com bookings pré-existentes no DB · CRITICIDADE: Minor · AMBIENTE: staging · EVIDÊNCIA: saída Playwright "3 flaky" |
| QA-22 | **Sessões fixture staging** — 10+ specs afetados | **[RESOLVIDA (era fixture expirada) — 2026-06-13]** Fixtures locatário/proprietário/admin regenerados com sucesso via `npx tsx scripts/create-staging-fixtures.ts`. Timestamps: session-locatario.json 08:11:39, session-proprietario.json 08:11:42, session-admin.json 08:11:45. Os fixtures de financeiro e operacional (05/06) continuam expirados por não haver `FIXTURE_FINANCEIRO_PASSWORD`/`FIXTURE_OPERACIONAL_PASSWORD` no env local — esses testes continuam protegidos por `test.skip` condicional (existência do arquivo) mas as sessões expiradas causam falha quando o spec é executado. Confirmado: as 3 falhas que eram puramente de fixture expirada (QA-02/10/13 parte das razões) não estão mais no topo — mas o `BASE_URL` ausente é a causa real persistente. | AÇÃO RESIDUAL: definir senha de financeiro/operacional em `.env.local` para regenerar essas sessões. |
| QA-23 | `admin-usuarios.spec.ts:106,132,152,170` / Grupo 2 CRUD | **[NOVO — s11]** 4 testes do Grupo 2 (CRUD de admins) falham com **429 Too Many Requests** em vez de 201/400/409. A suíte serial executa múltiplas chamadas de criação de admin em sequência rápida — o rate limiter do endpoint `/api/admin/usuarios` bloqueia após N requests. O rate limit está muito agressivo para testes sequenciais. | TÍTULO: [admin-usuarios Grupo 2] — rate limit 429 bloqueia testes sequenciais de CRUD admin · CRITICIDADE: Minor (infra de testes, não afeta usuário real) · CORREÇÃO: adicionar `test.setTimeout` maior + `waitForTimeout(1000)` entre requests no spec, ou usar credenciais diferentes por sub-teste. |
| QA-24 | `security2.spec.ts:91` / smoke #19 password reset | **[NOVO — s11 / BASE_URL ausente]** `security2.spec.ts` usa `BASE = process.env.BASE_URL ?? 'http://localhost:3000'`. Smoke #19 faz POST para `/api/auth/forgot-password` via `fetch(BASE + ...)` e tenta parsear a resposta como JSON. Com servidor local não rodando, recebe HTML de erro → `SyntaxError: Unexpected end of JSON input`. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-25 | `security5.spec.ts:61` / smoke #29 review após COMPLETED | **[NOVO — s11 / BASE_URL ausente + estado DB]** Smoke #29 usa `BASE`. Requests vão para localhost:3000. Também há indicação de que o booking fixture no staging pode não estar em COMPLETED. | CORREÇÃO: `BASE_URL` + verificar estado do booking lifecycle no DB. |

---

## 🔴 P0 — Bloqueia abertura para produção

| # | Atividade | Detalhe |
|---|---|---|
| 1 | ✅ **CSP com nonces** | `unsafe-inline` removido do `script-src`; nonce gerado por request em `middleware.ts`; aplicado em layout JSON-LD e GA4 |
| 2 | ✅ **Rate limiting Upstash** | Código já suportava Upstash via `@upstash/ratelimit` — só precisa das env vars no Vercel: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| 3 | ⏳ **Supabase production** | **Aguarda validação 100% de staging** — criar apenas após aprovação final; GitHub environment `production` com Required Reviewers |
| 4 | ✅ **Fix senhas hardcoded (GitGuardian)** | Resolvido 06/06/2026: `git filter-repo` limpou 477 commits, senhas trocadas no provedor de email, movidas para `FIXTURE_FINANCEIRO_PASSWORD` / `FIXTURE_OPERACIONAL_PASSWORD`, sessions regeneradas. |
| 5 | ✅ **Política de cancelamento hardcoded** | Resolvido 2026-06-12: `getCancellationConfig()` em `lib/platform-config.ts` (chaves `cancelation*`); `calcRefund()` aceita config opcional. |
| 6 | ✅ **Taxa de atraso hardcoded (1,5×)** | Resolvido 2026-06-12: `getLateFeeMultiplier()` (chave `lateFeeMultiplierX100`); cron e e-mail recebem o valor dinâmico. |
| 7 | ✅ **Limiares de tier embaixador hardcoded** | Resolvido 2026-06-12: `getAmbassadorThresholds()` (chaves `ambassadorSilverThreshold`/`ambassadorGoldThreshold`). |
| 8 | ✅ **Janela de referral hardcoded (30 dias)** | Resolvido 2026-06-12: `getReferralWindowDays()` (chave `referralWindowDays`). |

---

## 🟠 P1 — Necessário antes do MVP público

| # | Atividade | Detalhe |
|---|---|---|
| 4 | ✅ **Preservação de contexto de busca** | `ItemCard` passa `?back=` com filtros; detalhe do item usa no link "← Voltar" |
| 5 | ✅ **Extensão de prazo — UI** | Locatário solicita nova data; proprietário aprova/recusa via banner; chama `POST/PATCH /extend` |
| 6 | ✅ **Relatório de problema estruturado** | 4 categorias + descrição obrigatória + foto opcional; abre disputa com reason formatada |
| 7 | ✅ **Prazos de auto-cancelamento hardcoded** | Resolvido 2026-06-12: `getAutoCancelConfig()` (chaves `autoCancelPendingHours`/`autoCancelOwnerHours`); mensagens de notificação dinâmicas. |
| 8 | ✅ **Janela de payout hardcoded (3 dias)** | Resolvido 2026-06-12: `getPayoutWindowDays()` (chave `payoutWindowDays`); `payout.create` agora com `await` (era fire-and-forget). |
| 9 | ✅ **Limites de upload hardcoded** | Resolvido 2026-06-12: `getUploadLimits()` (chaves `maxImagesPerItem`/`maxUploadSizeMB`) aplicado em 4 endpoints (images, upload, photos, id-verification). |
| 10 | ✅ **Rate limits hardcoded** | Resolvido 2026-06-12: mapa `RATE_LIMITS` exportado em `lib/rateLimit.ts`; 13 endpoints atualizados. |
| 11 | ✅ **Teto R$500 sem aviso na UI** | Resolvido 2026-06-12: `_PriceCalc.tsx` exibe alerta e desabilita CTA quando subtotal > `CHECKOUT_MAX_CENTS`. |
| 12 | ✅ **geocodeItem fire-and-forget** | Resolvido 2026-06-12: callers em `POST /api/items` e `PUT /api/items/[id]` envolvidos em `after()` do Next.js. |

---

## 🟡 P2 — Polimento pré-lançamento

| # | Atividade | Detalhe |
|---|---|---|
| 7 | **PWA ícones** | `pwa-icon-192.png` e `pwa-icon-512.png` — substituir por assets finais (1024×1024 ideal); dependem do Roberto |
| 8 | **PWA screenshots** | `manifest.ts` pede `wide` + `mobile`; dependem do Roberto |
| 9 | **Página `/sobre`** | Prioritária entre os stubs — missão, história, equipe do ShareO |
| 10 | **Stubs com conteúdo** | `/politicas`, `/suporte`, `/comunidade` — páginas existem sem conteúdo real |
| 11 | ✅ **Jest global `next-auth@5`** | `transformIgnorePatterns` atualizado para `@upstash\|next-auth\|@auth`; testes de badge corrigidos; 21 suítes / 355 testes / 0 falhas |
| 12 | ✅ **Sentry source maps + alertas** | Source maps chegando (184–248 arquivos por build); alertas criados: novo issue + erros acima de 10/hora |
| 13 | ✅ **Countdown devolução** | `components/booking/ReturnCountdown.tsx` — já wired em `app/reservas/[id]/page.tsx` |
| 14 | ✅ **Onboarding do primeiro anúncio** | `ListingQualityIndicator` + `ItemCardPreview` + dicas inline já no `ItemForm.tsx` |
| 15 | ✅ **Prazos de token de auth hardcoded** | Resolvido 2026-06-12: `lib/auth-config.ts` com `EMAIL_VERIFY_TOKEN_TTL_MS` e `PASSWORD_RESET_TOKEN_TTL_MS`; 3 rotas atualizadas. |
| 16 | ✅ **Thresholds de badges hardcoded** | Resolvido 2026-06-12: `BORROWER_BADGES` agora exportado; `REPUTATION_PER_REVIEW` já era constante nomeada. |
| 17 | ✅ **Fatores de CO₂ hardcoded** | Já eram constantes nomeadas exportadas (`CO2_KG_PER_BOOKING_DAY`, `CO2_KG_PER_TREE_PER_YEAR`) — sem ação necessária. |
| 18 | ✅ **Checkout Stripe expira em 30 min hardcoded** | Resolvido 2026-06-12: `STRIPE_CHECKOUT_EXPIRES_SECONDS` em `lib/platform-config.ts`. |
| 19 | ✅ **sendExportReadyEmail (ADR-016)** | Resolvido 2026-06-12: template criado em `lib/email.ts`; export assíncrono notifica o admin e usa `after()` (era fire-and-forget). |

---

## 🟢 P3 — Pós-produção

| # | Atividade | Detalhe |
|---|---|---|
| 25 | **Verificação de celular via SMS OTP (Zenvia)** | Decisão Raimundo 2026-06-10. Provedor: Zenvia (~R$0,12–0,20/SMS, melhor entrega BR). Fluxo: OTP 6 dígitos, TTL 10min, bcrypt no banco. Schema: `phoneVerifiedAt`, `phoneOtpHash`, `phoneOtpExpiresAt`. Gate: bloqueia 1ª reserva se não verificado. Endpoints: `POST /api/phone/send-otp` + `POST /api/phone/verify-otp`. UI em `/perfil/seguranca`. Estimativa: ~1 sprint. |
| 15 | **Lighthouse CI** | LCP < 2,5s, CLS < 0,1, INP < 200ms — medir no CI após preview URL estável |
| 16 | **k6 load test** | 50 usuários em `GET /api/items`, P95 < 1s |
| 17 | **Expo Go — teste mobile** | `cd apps/mobile && npx expo start --tunnel --clear` |
| 18 | **Chat com templates** | Mensagens pré-prontas que preenchem o campo (não enviam sozinhas) |
| 19 | **Avaliação por critérios** | Item como descrito / pontualidade / comunicação / conservação |
| 20 | **Gamificação** | Badges Bronze/Prata/Ouro, pontos de reputação, cupom 10% off por avaliar |
| 21 | **CO₂ por categoria** | Campo no schema Prisma — adiado (risco de migration) |
| 22 | ✅ **Duplicata haversine** | Verificado 2026-06-12: `utils/geo.ts` só contém `buildSlug` — `lib/haversine.ts` já é o canônico único. Item estava desatualizado. |
| 23 | **KPIs instrumentados** | Bounce < 40%, CTR cards > 15%, conversão > 8%, NPS > 50 |
| 24 | **Validação Android real** | Samsung Galaxy A13 com Expo Go |

---

## Resumo executivo

| Prioridade | Qtd | Foco |
|---|---|---|
| ✅ Concluídos | 27 | Verificados diretamente no código |
| 🔴 P0 | 7 | Bloqueia produção (inclui 4 hardcoded críticos: política cancelamento, late fee, tier embaixador, janela referral) |
| 🟠 P1 | 6 | MVP público (inclui 4 hardcoded: auto-cancel, payout window, upload limits, rate limits) |
| 🟡 P2 | 12 | Polimento e assets (inclui 4 hardcoded: tokens auth, badges, CO₂, Stripe session) |
| 🟢 P3 | 11 | Pós-produção |

> **Varredura de hardcoded realizada em 2026-06-12** — 61 valores encontrados, 16 priorizados acima (P0–P2). Os demais 45 são constantes de validação de string (mín/máx chars), limites de paginação e constantes de UI considerados aceitáveis como literais no código.

### Inventário completo de hardcoded (referência)

| Arquivo | Valor | O que é | Prioridade |
|---|---|---|---|
| `lib/cancellationPolicy.ts` | `100%, 70%, 50%`, `24h`, `6h` | Política reembolso e janelas | P0 |
| `lib/email.ts:561` + `cron/reminders/route.ts:118` | `1.5` | Multiplicador taxa de atraso | P0 |
| `lib/ambassador.ts:16` | `11`, `51` | Limiares de tier Bronze/Prata/Ouro | P0 |
| `lib/referral.ts:11` | `30` dias | Janela atribuição de referral | P0 |
| `app/api/cron/expire-bookings/route.ts:26` | `2h` | Auto-cancel PENDING sem resposta | P1 |
| `app/api/cron/auto-cancel/route.ts:20` | `48h` | Auto-cancel proprietário sem ação | P1 |
| `app/api/bookings/[id]/route.ts:303` | `3` dias | Janela elegibilidade payout | P1 |
| `app/api/items/[id]/images/route.ts:10` | `10` imagens | Máx fotos por item | P1 |
| `app/api/upload/route.ts:21` et al. | `10 MB` | Limite tamanho arquivo | P1 |
| Rate limits em 8+ endpoints | vários | Req/min por IP ou usuário | P1 |
| `app/api/auth/register/route.ts:119` + `resend-verification` | `48h` | Expiração token verificação e-mail | P2 |
| `app/api/auth/forgot-password/route.ts:50` | `60 min` | Expiração link reset senha | P2 |
| `lib/badges.ts:19-22` | `3, 10, 25, 50` | Reservas para badge borrower | P2 |
| `lib/badges.ts:58` | `10` pontos | Reputação por avaliação | P2 |
| `lib/co2.ts:13-14` | `0.5`, `21.77` | Fatores CO₂ por booking e árvore | P2 |
| `app/api/payments/checkout/route.ts:125` | `30 min` | Expiração sessão Stripe Checkout | P2 |

---

## Fora de escopo (decisões fechadas)

| Item | Motivo |
|---|---|
| WhatsApp (chat, Business API) | Decisão explícita do produto |
| Pagamento Pix/Boleto | Stripe já implementado — outros métodos são H2+ |
| Push notifications FCM | Não planejado para H1 |
| Vídeo de verificação | H3 |
| Aluguel recorrente/assinatura | H2 |
| Seguro contra danos automático | H2 |
| Dark mode | Fora do escopo H1 — documentado |
| Busca por voz | Fora dos requisitos MVP |
| RLS Supabase | Desabilitado — incompatível com PgBouncer; segurança via `ownerId !== session.user.id → 403` |
