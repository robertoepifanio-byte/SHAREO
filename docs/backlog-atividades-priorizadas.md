# Backlog de Atividades Priorizadas — ShareO

**Versão:** 2.0  
**Data:** 2026-05-30  
**Base:** Plano de Teste QA (v2.0) + Análise UX/UI externa + Fluxo de Usuário Completo  
**Responsável:** Roberto Epifânio

> Sugestões descartadas por conflito com decisões do projeto:
> WhatsApp (explícito), pagamento integrado (H3), push FCM (fora do sprint), vídeo (H3), aluguel recorrente (H2).

---

## 🔴 P0 — Bloqueante para qualquer release

| # | Atividade | Origem |
|---|---|---|
| 1 | Ativar `coverageThreshold` no `jest.config.ts` (hoje zerado — CI sem guarda de qualidade) | QA |
| 2 | `__tests__/unit/validations/bookings.test.ts` — máquina de 7 estados | QA |
| 3 | `__tests__/unit/lib/pricing.test.ts` — cálculo financeiro | QA |
| 4 | `__tests__/unit/lib/crypto.test.ts` — CPF/CNPJ criptografados | QA |
| 5 | Implementar **empty states** em `/itens`, `/reservas`, `/mensagens`, `/meus-anuncios` com mensagem amigável + CTA | UX |
| 6 | Implementar **páginas de erro 404 e 500** com design ShareO — sem stack trace exposto | UX |
| 7 | Implementar **política de cancelamento transparente** na reserva: até 24h = 100%, 24h–6h = 70%, < 6h = 50% | Fluxo |
| 8 | Configurar **3 instâncias Supabase** (dev / staging / prod) | Infra |
| 9 | Criar `.github/workflows/ci.yml` (lint → testes → build → deploy preview) | Infra |
| 10 | Implementar **políticas RLS** no Supabase | Segurança |

---

## 🟠 P1 — Necessário antes do MVP público

| # | Atividade | Origem |
|---|---|---|
| 11 | `__tests__/integration/api/bookings/patch.test.ts` — 14 transições de estado | QA |
| 12 | `e2e/booking-flow.spec.ts` — jornada completa locatário→proprietário→COMPLETED | QA |
| 13 | `e2e/auth.spec.ts` — cadastro, login, logout, redirect | QA |
| 14 | `__tests__/integration/api/auth/register.test.ts` — CPF duplicado, rate limit, PII | QA |
| 15 | `__tests__/unit/validations/auth.test.ts` — 14 cenários | QA |
| 16 | `__tests__/unit/lib/rateLimit.test.ts` | QA |
| 17 | `__tests__/unit/middleware.test.ts` — 8 cenários de proteção de rotas | QA |
| 18 | `e2e/navigation.spec.ts` — header visível e sticky em todas as páginas, menu mobile | QA/UX |
| 19 | `e2e/search-filter.spec.ts` — busca, filtros, deep link com URL params | QA/UX |
| 20 | Verificar e corrigir **filtro de distância mobile** — `hidden md:flex` sem alternativa (implementar bottom sheet) | Bug/UX |
| 21 | Verificar e ajustar `ItemCard` para exibir **rating, distância em km e badge de disponibilidade** | UX |
| 22 | Implementar **calendário de disponibilidade** na página de detalhe do item — verde = livre, vermelho = ocupado | Fluxo |
| 23 | Exibir **taxa de resposta do proprietário** e número de aluguéis na página de detalhe | Fluxo |
| 24 | Implementar **timeout automático de reserva** — após 2h sem resposta: sugerir itens similares; após 4h: cancelar automaticamente | Fluxo |
| 25 | Exibir **código da reserva** (`#SHR-AAAA-MMDD-NNN`) e **"Próximos passos"** na tela de confirmação | Fluxo |
| 26 | Implementar formulário estruturado de **"Reportar problema"** (não funciona / veio danificado / faltam acessórios / outro + foto) | Fluxo |
| 27 | Implementar **extensão de prazo** — locatário solicita nova data, proprietário aprova/recusa via app | Fluxo |
| 28 | Exibir **política de cancelamento** visível na página de detalhe e no checkout | Fluxo |
| 29 | Implementar **chips de filtros ativos** com X para remover individualmente ("Ferramentas ✕ • Até R$50 ✕") | UX |
| 30 | Implementar **breadcrumb** na página de detalhe (Início > Categoria > Item) | UX/SEO |
| 31 | Implementar **seção "Itens similares"** no final da página de detalhe | UX |
| 32 | Criar backlog inicial de histórias de usuário | Produto |
| 33 | Preservação de contexto de busca — `useSearchParams` persistente com `router.push` ao filtrar; `<Link href={/itens?${searchParams}}>Voltar</Link>` no componente de detalhe | UX/Fluxo |
| 34 | Tela "Aguardando Confirmação" após solicitação de reserva — tela dedicada com countdown 2h + carrossel de itens similares + notificação quando proprietário responder (spec UX do estado de espera do P1-#24) | UX/Fluxo |

---

## 🟡 P2 — Qualidade antes do lançamento

| # | Atividade | Origem |
|---|---|---|
| 33 | Adicionar `jest-axe` em todos os componentes UI: `Button`, `Input`, `ItemCard`, `HomeMapPanel`, `ItemForm`, `BookingProgressBar`, `SearchBar`, `EmptyState`, `Skeleton` | QA/A11y |
| 34 | `__tests__/integration/api/bookings/reviews.test.ts` — 11 cenários | QA |
| 35 | `__tests__/integration/api/conversations/messages.test.ts` — sanitização XSS, autorização | QA |
| 36 | `e2e/favorites.spec.ts` — salvar/remover, tap target 44px | QA/UX |
| 37 | `e2e/responsive.spec.ts` — grid 1/2/4 colunas nos três breakpoints | QA |
| 38 | `e2e/error-pages.spec.ts` — 404, 500, offline state | QA/UX |
| 39 | Adicionar **projeto tablet (768px)** ao `playwright.config.ts` | Config |
| 40 | Configurar **Sentry** com `beforeSend` mascarando PII | Infra/Segurança |
| 41 | Auditar **dados sensíveis em respostas de API** — CPF/CNPJ/passwordHash nunca vazam | Segurança |
| 42 | `__tests__/unit/lib/haversine.test.ts` | QA |
| 43 | `__tests__/unit/components/items/ItemCard.test.tsx` — rating, distância, alt, axe | QA |
| 44 | `__tests__/unit/lib/co2.test.ts` — cálculo de CO₂ por reservas concluídas | QA |
| 45 | Verificar e corrigir **contraste de cor** — laranja `#F97316` em fundo branco (risco WCAG 4.5:1) | A11y |
| 46 | Implementar e testar **skeleton screens** com `aria-busy="true"` nas listagens | UX/A11y |
| 47 | Implementar **countdown timer** na reserva ativa ("Devolução em 1 dia, 4h e 23min") | Fluxo |
| 48 | Implementar **lembrete de devolução** por notificação in-app/email no dia do prazo | Fluxo |
| 49 | Implementar **checklist de devolução** no app — item limpo? acessórios? mesmo estado? + foto | Fluxo |
| 50 | Implementar **confirmação de estado na devolução** pelo proprietário — perfeito / desgaste normal / com danos | Fluxo |
| 51 | Exibir **depósito de segurança e regras do anunciante** de forma destacada no detalhe do item | Fluxo |
| 52 | Exibir **sugestão de preço médio da região** no formulário de anúncio ("Preço médio perto de você: R$30–40") | UX |
| 53 | Implementar **pull to refresh** na listagem de itens (mobile) | UX |
| 54 | Implementar **pinch para zoom** na galeria de fotos (mobile) | UX |
| 55 | Implementar **swipe left no card** para salvar favorito (mobile gesture) | UX |
| 56 | Implementar **bottom sheet** para filtros no mobile (em vez de sidebar oculta) | UX |
| 57 | Adicionar **"Ver no mapa"** como opção na listagem `/itens` | UX |
| 58 | Exibir **próximas devoluções** com countdown no dashboard do proprietário | Fluxo |
| 59 | Adicionar botão **"Enviar lembrete"** ao locatário no dashboard do proprietário | Fluxo |
| 60 | Implementar **meta mensal com progress bar** no dashboard do proprietário | Fluxo/UX |
| 61 | Incluir `app/api/**` e `middleware.ts` no `collectCoverageFrom` do `jest.config.ts` | Config |
| 62 | Onboarding progressivo para o primeiro anúncio — progress indicator de qualidade (0–100%), dicas inline por campo, prévia do ItemCard em tempo real, tooltip "Anúncios com 3+ fotos recebem 4x mais contatos" | UX/Fluxo |

---

## 🟢 P3 — Diferenciação e escala

| # | Atividade | Origem |
|---|---|---|
| 63 | Auditorias **Lighthouse** em `/`, `/itens`, `/itens/[id]` — LCP < 2,5s, CLS < 0,1, INP < 200ms | Performance |
| 64 | `e2e/admin.spec.ts` — acesso restrito, aprovação de itens, suspensão de usuários | QA |
| 65 | `e2e/chat.spec.ts` — envio em tempo real, templates, sanitização XSS | QA |
| 66 | Implementar **chat com templates de mensagem** pré-prontos (preenchem campo, não enviam sozinhos) | UX/Fluxo |
| 67 | Implementar **avaliação por critérios múltiplos** — item como descrito, pontualidade, comunicação, conservação | UX/Fluxo |
| 68 | Implementar **emoji de satisfação rápido** (😍😊😐😕😠) como entrada da avaliação antes dos critérios | UX |
| 69 | Permitir **foto do item em uso** na avaliação | Fluxo |
| 70 | Implementar **pontos de reputação** — +10 por avaliação enviada, histórico no perfil | Gamificação |
| 71 | Implementar **badges de locatário** — Bronze (3 aluguéis), Prata (10), Ouro (25), Diamante (50) | Gamificação |
| 72 | Implementar **"Avaliador ativo"** badge + cupom 10% off no próximo aluguel ao avaliar | Gamificação |
| 73 | Exibir equivalência de CO₂ em árvores ("45 kg evitados = 2 árvores plantadas") no dashboard | Gamificação |
| 74 | Implementar **progress bars de conquistas** no perfil do usuário | Gamificação |
| 75 | Implementar emails de **reengajamento pós-aluguel** via SendGrid/Resend: 1d (avalie), 7d (itens similares), 30d (favorito disponível) | Retenção |
| 76 | Implementar **dicas de fotografia inline** no formulário de anúncio | UX |
| 77 | Implementar **CTA flutuante mobile** "Anunciar item" com tap target >= 44px | UX |
| 78 | Implementar **banner dinâmico na home** com dados reais da cidade do usuário | UX |
| 79 | Resolver **duplicata haversine** — `lib/haversine.ts` (km) vs `utils/geo.ts` (metros), definir canônico | Refactor |
| 80 | Migrar `lib/rateLimit.ts` de `Map` in-memory para **Upstash Redis** | Infra/Segurança |
| 81 | Teste de carga **k6** — 50 usuários em `GET /api/items`, P95 < 1s | Performance |
| 82 | Definir e instrumentar **KPIs por fase** — bounce < 40%, CTR cards > 15%, conversão > 8%, NPS > 50 | Produto |
| 83 | `__tests__/unit/utils/format.test.ts` — `formatPrice`, `formatDistance` | QA |
| 84 | `__tests__/unit/utils/geo.test.ts` — `buildSlug`, `haversineDistance` | QA |
| 85 | Validação em **dispositivo Android real** (Samsung Galaxy A13) | QA |

---

## Resumo executivo

| Prioridade | Qtd | Foco principal |
|---|---|---|
| 🔴 P0 | 10 | Testes críticos + infraestrutura + política de cancelamento |
| 🟠 P1 | 24 | Fluxo completo do aluguel + UX essencial |
| 🟡 P2 | 30 | Qualidade, acessibilidade, UX mobile e fluxo de devolução |
| 🟢 P3 | 23 | Gamificação, reengajamento, performance e diferenciação |
| **Total** | **87** | |

---

## Sugestões descartadas (com justificativa)

| Sugestão | Documento | Motivo |
|---|---|---|
| WhatsApp (botão, chat, Business API) | Fluxo usuário | Conflito explícito com decisão do projeto |
| Pagamento integrado (Stripe/Pix/Boleto) | Fluxo usuário | H3 — fora do escopo MVP |
| Push notifications Firebase FCM | Fluxo usuário | Não planejado para sprint atual |
| Verificação em vídeo | Fluxo usuário + UX | H3 — fora do escopo MVP |
| Aluguel recorrente/assinatura | Fluxo usuário + UX | H2 — fora do escopo MVP |
| Seguro contra danos automático | UX | H2 — fora do escopo MVP |
| Cor primária verde `#2ECC71` | UX | Conflita com design system (Navy + Orange) |
| Busca por voz | UX | Não está nos requisitos MVP |
