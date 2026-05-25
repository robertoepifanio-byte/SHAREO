# ShareO — Status do Projeto

**Atualizado em**: 2026-05-24  
**Branch ativa**: `feat/sprint-3-chat`  
**Público**: Time técnico, Gestor de Projeto, PO

---

## Resumo Executivo

O MVP está em desenvolvimento ativo. **Sprint 1** (auth) e **Sprint 2** (anúncios) foram entregues e estão em produção local. O frontend foi alinhado ao protótipo oficial em todas as telas implementadas. A **Sprint 3** (reservas + chat) está em andamento.

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
| Seed de imagens demo | ✅ Feito | `scripts/seed-images.mjs` |

---

### 🔄 Sprint 3 — Reservas e Chat (em andamento)

| Feature | Status | Notas |
|---|---|---|
| `POST /api/bookings` | ❌ Pendente | CTA "Solicitar locação" já está no UI com `alert("em breve")` |
| Fluxo de reserva (7 estados) | ❌ Pendente | Máquina de estados definida no PRD |
| Chat entre locador/locatário | ❌ Pendente | Supabase Realtime (ADR-003) |
| Notificações in-app | ❌ Pendente | — |
| Página `/reservas` (dashboard) | ❌ Pendente | — |

---

## Alinhamento UI ao Protótipo

| Tela | Status | Observações |
|---|---|---|
| Landing Page (`/`) | ✅ Alinhada | Hero, categorias com ícones PNG, grid de itens, "Como funciona", CTA |
| Header / AppHeader | ✅ Alinhado | Logo navy, nav Início·Explorar·Anunciar, ações Entrar/+Anunciar |
| Explorar (`/itens`) | ✅ Alinhada | Sidebar filtros (lg+), chips com ícones 40px, sort, paginação |
| Detalhe (`/itens/[id]`) | ✅ Alinhada | Galeria, calculadora, card sticky, avaliações, mini-card dono |
| Login / Cadastro | ✅ Alinhados | Logo `shareo-logo-fb.png`, formulários com validação |
| Perfil do usuário | ❌ Pendente | — |
| Dashboard de reservas | ❌ Pendente | — |
| Chat | ❌ Pendente | — |
| Admin | ❌ Pendente | — |

---

## Componentes e Infra

| Item | Status | Artefato |
|---|---|---|
| `CategoryIcon` (centralizado) | ✅ Feito | `components/ui/CategoryIcon.tsx` |
| `ItemCard` | ✅ Feito | `components/items/ItemCard.tsx` |
| `AppHeader` | ✅ Feito | `components/layout/AppHeader.tsx` |
| `SortSelect` | ✅ Feito | `app/itens/_SortSelect.tsx` |
| Prisma schema (11 models) | ✅ Feito | `prisma/schema.prisma` |
| Seed de categorias | ✅ Feito | `prisma/seed.ts` |
| CI/CD (GitHub Actions) | ✅ Feito | `.github/workflows/ci.yml` |
| RLS policies (Supabase) | ✅ Feito | `supabase/rls-policies.sql` |
| 3 instâncias Supabase | ❌ Pendente | Ação manual de infra |
| Deploy Vercel (staging) | ❌ Pendente | — |

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
| Package manager | pnpm | package.json |
| ORM | Prisma v5 | schema.prisma |

---

## Próximos Passos — Sprint 3

1. `POST /api/bookings` — criar reserva com validação de datas e conflito
2. `GET /api/bookings` — listar reservas do usuário (locador e locatário)
3. `PATCH /api/bookings/[id]` — máquina de estados (aceitar, recusar, cancelar, concluir)
4. Página `/reservas` — dashboard com abas "Como locatário" / "Como locador"
5. Supabase Realtime — canal de mensagens por conversa
6. Página `/mensagens` — lista de conversas + chat em tempo real
