# Backlog de Atividades Priorizadas — ShareO

**Versão:** 3.4  
**Atualizado em:** 2026-06-12 (sessão 2 — hardcoded P0/P1/P2 resolvidos)  
**Responsável:** Roberto Epifânio

> Verificação feita diretamente no código — cada item foi confirmado por arquivo/componente.

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
