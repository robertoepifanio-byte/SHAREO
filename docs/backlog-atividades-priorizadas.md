# Backlog de Atividades Priorizadas — ShareO

**Versão:** 3.1  
**Atualizado em:** 2026-06-04 (verificação completa do código)  
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

---

## 🟠 P1 — Necessário antes do MVP público

| # | Atividade | Detalhe |
|---|---|---|
| 4 | ✅ **Preservação de contexto de busca** | `ItemCard` passa `?back=` com filtros; detalhe do item usa no link "← Voltar" |
| 5 | ✅ **Extensão de prazo — UI** | Locatário solicita nova data; proprietário aprova/recusa via banner; chama `POST/PATCH /extend` |
| 6 | ✅ **Relatório de problema estruturado** | 4 categorias + descrição obrigatória + foto opcional; abre disputa com reason formatada |

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

---

## 🟢 P3 — Pós-produção

| # | Atividade | Detalhe |
|---|---|---|
| 15 | **Lighthouse CI** | LCP < 2,5s, CLS < 0,1, INP < 200ms — medir no CI após preview URL estável |
| 16 | **k6 load test** | 50 usuários em `GET /api/items`, P95 < 1s |
| 17 | **Expo Go — teste mobile** | `cd apps/mobile && npx expo start --tunnel --clear` |
| 18 | **Chat com templates** | Mensagens pré-prontas que preenchem o campo (não enviam sozinhas) |
| 19 | **Avaliação por critérios** | Item como descrito / pontualidade / comunicação / conservação |
| 20 | **Gamificação** | Badges Bronze/Prata/Ouro, pontos de reputação, cupom 10% off por avaliar |
| 21 | **CO₂ por categoria** | Campo no schema Prisma — adiado (risco de migration) |
| 22 | **Duplicata haversine** | `lib/haversine.ts` (km) vs `utils/geo.ts` (metros) — definir canônico e remover o outro |
| 23 | **KPIs instrumentados** | Bounce < 40%, CTR cards > 15%, conversão > 8%, NPS > 50 |
| 24 | **Validação Android real** | Samsung Galaxy A13 com Expo Go |

---

## Resumo executivo

| Prioridade | Qtd | Foco |
|---|---|---|
| ✅ Concluídos | 27 | Verificados diretamente no código |
| 🔴 P0 | 3 | Bloqueia produção |
| 🟠 P1 | 3 | Fluxo incompleto (UI faltando para features com API pronta) |
| 🟡 P2 | 8 | Polimento e assets |
| 🟢 P3 | 10 | Pós-produção |

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
