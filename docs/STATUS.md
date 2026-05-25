# ShareO — Status do Projeto

**Atualizado em**: 2026-05-24  
**Branch ativa**: `feat/sprint-3-chat`  
**Público**: Time técnico, Gestor de Projeto, PO

---

## Resumo Executivo

Sprints 1, 2 e 3 concluídas. O fluxo central do produto está funcional de ponta a ponta: cadastro → anúncio → busca → reserva → chat. Próxima frente: avaliações, perfil do usuário e admin dashboard.

---

## Progresso por Sprint

### ✅ Sprint 1 — Autenticação e Perfil (concluída)

| Feature | Status | Arquivos |
|---|---|---|
| Página `/login` | ✅ Feito | `app/(auth)/login/page.tsx` |
| Página `/cadastro` | ✅ Feito | `app/(auth)/cadastro/page.tsx` |
| Layout auth com logo | ✅ Feito | `app/(auth)/layout.tsx` |
| NextAuth.js v5 (Credentials) | ✅ Feito | `lib/auth.ts` |
| `POST /api/auth/register` | ✅ Feito | `app/api/auth/register/route.ts` |

---

### ✅ Sprint 2 — Domínio de Anúncios (concluída)

| Feature | Status | Arquivos |
|---|---|---|
| CRUD de itens | ✅ Feito | `app/api/items/` |
| Upload de fotos | ✅ Feito | `app/api/items/[id]/images/` |
| Formulário de anúncio (`/itens/novo`) | ✅ Feito | `app/itens/novo/page.tsx` |
| Edição de anúncio (`/itens/[id]/editar`) | ✅ Feito | `app/itens/[id]/editar/page.tsx` |
| Página Explorar (`/itens`) | ✅ Feito | `app/itens/page.tsx` |
| Página de detalhe (`/itens/[id]`) | ✅ Feito | `app/itens/[id]/page.tsx` |
| Galeria interativa | ✅ Feito | `app/itens/[id]/_Gallery.tsx` |
| Calculadora de preço | ✅ Feito | `app/itens/[id]/_PriceCalc.tsx` |
| FavoriteButton | ✅ Feito | `components/items/FavoriteButton.tsx` |

---

### ✅ Sprint 3 — Reservas e Chat (concluída)

| Feature | Status | Arquivos |
|---|---|---|
| `POST /api/bookings` | ✅ Feito | `app/api/bookings/route.ts` |
| `GET /api/bookings` | ✅ Feito | `app/api/bookings/route.ts` |
| `GET /api/bookings/[id]` | ✅ Feito | `app/api/bookings/[id]/route.ts` |
| `PATCH /api/bookings/[id]` — máquina de 7 estados | ✅ Feito | `app/api/bookings/[id]/route.ts` |
| Página `/reservas` — dashboard Locatário/Locador | ✅ Feito | `app/reservas/page.tsx` |
| Página `/reservas/[id]` — detalhe + ações | ✅ Feito | `app/reservas/[id]/page.tsx` |
| `GET /api/conversations` | ✅ Feito | `app/api/conversations/route.ts` |
| `GET /api/conversations/[id]` | ✅ Feito | `app/api/conversations/[id]/route.ts` |
| `POST /api/conversations/[id]/messages` | ✅ Feito | `app/api/conversations/[id]/messages/route.ts` |
| `PATCH /api/conversations/[id]/read` | ✅ Feito | `app/api/conversations/[id]/read/route.ts` |
| Página `/mensagens` — lista de conversas | ✅ Feito | `app/mensagens/page.tsx` |
| Chat em tempo real (`/mensagens/[id]`) | ✅ Feito | `app/mensagens/[id]/page.tsx` + `_ChatWindow.tsx` |
| Notificações in-app (fire-and-forget) | ✅ Feito | integrado nas rotas de bookings e mensagens |

---

## Alinhamento UI ao Protótipo

| Tela | Status | Observações |
|---|---|---|
| Landing Page (`/`) | ✅ Alinhada | Hero, categorias com ícones PNG, grid de itens, "Como funciona", CTA |
| Header / AppHeader | ✅ Alinhado | Logo navy, nav Início·Explorar·Anunciar·Reservas·Mensagens |
| Explorar (`/itens`) | ✅ Alinhada | Sidebar filtros (lg+), chips com ícones 40px, sort, paginação |
| Detalhe (`/itens/[id]`) | ✅ Alinhada | Galeria, calculadora conectada à API, card sticky, avaliações |
| Login / Cadastro | ✅ Alinhados | Logo `shareo-logo-fb.png` |
| Reservas (`/reservas`) | ✅ Implementada | Abas Locatário/Locador, cards com status e ações |
| Chat (`/mensagens`) | ✅ Implementada | Lista de conversas + tela de chat com envio otimista |
| Perfil do usuário | ❌ Pendente | — |
| Admin dashboard | ❌ Pendente | — |

---

## Componentes e Infra

| Item | Status | Artefato |
|---|---|---|
| `CategoryIcon` (centralizado) | ✅ Feito | `components/ui/CategoryIcon.tsx` |
| `ItemCard` | ✅ Feito | `components/items/ItemCard.tsx` |
| `AppHeader` | ✅ Feito | `components/layout/AppHeader.tsx` |
| `SortSelect` | ✅ Feito | `app/itens/_SortSelect.tsx` |
| `BookingActions` | ✅ Feito | `app/reservas/[id]/_BookingActions.tsx` |
| `ChatWindow` | ✅ Feito | `app/mensagens/[id]/_ChatWindow.tsx` |
| Zod schemas — bookings | ✅ Feito | `lib/validations/bookings.ts` |
| Zod schemas — messages | ✅ Feito | `lib/validations/messages.ts` |
| Prisma schema (11 models) | ✅ Feito | `prisma/schema.prisma` |
| CI/CD (GitHub Actions) | ✅ Feito | `.github/workflows/ci.yml` |
| RLS policies (Supabase) | ✅ Feito | `supabase/rls-policies.sql` |
| 3 instâncias Supabase | ❌ Pendente | Ação manual de infra |
| Deploy Vercel (staging) | ❌ Pendente | — |
| Supabase Realtime (WebSocket) | ⚠️ Parcial | Chat usa polling 3s como fallback; WebSocket requer config do JWT NextAuth ↔ Supabase |

---

## Próximas Frentes — Sprint 4

1. **Avaliações** — `POST /api/bookings/[id]/reviews` após status `RETURNED`; estrelas na página de detalhe do item
2. **Perfil do usuário** — `/perfil/[id]` público + `/meu-perfil` com edição (nome, bio, avatar, cidade)
3. **Supabase Realtime** — substituir polling 3s por WebSocket real (canal `messages:conversation_id=eq.{id}`)
4. **Admin dashboard** — `/admin` com listagem de itens pendentes, usuários e logs
5. **Favoritos** — `GET /api/items/favorites` + página `/favoritos`

---

## Decisões Técnicas Fechadas

| Decisão | Escolha | Referência |
|---|---|---|
| Framework de autenticação | NextAuth.js v5 + Prisma Adapter | ADR-001 |
| API de mapas | Mapbox + PostGIS | ADR-002 |
| Chat em tempo real | Supabase Realtime (Postgres Changes) | ADR-003 |
| Criptografia de CPF/CNPJ | AES-256-GCM + bcrypt hash | ADR-004 |
| Renderização | SSG/SSR/ISR/CSR por tipo de página | CLAUDE.md |
| Pagamento no MVP | Fora do escopo — combinação direta | PRD.md §3.2 |
| Moderação de anúncios | Reativa (publicação direta no MVP) | PRD.md §3.2 |
| Chat fallback (MVP) | Polling 3s até Realtime estar configurado | `_ChatWindow.tsx` |
