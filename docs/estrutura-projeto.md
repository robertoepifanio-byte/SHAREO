# Estrutura de Pastas — ShareO (Next.js App Router)

**Versão**: 1.0  
**Data**: 2026-05-22  
**Autoridade**: Arquiteto  

Todo desenvolvedor deve seguir esta estrutura. Desvios requerem aprovação do Arquiteto via PR.

---

## Visão Geral

```
shareo-app/
├── app/                        # Rotas Next.js App Router
├── components/                 # Componentes React
├── lib/                        # Utilitários e clientes de serviços
├── hooks/                      # React hooks customizados
├── services/                   # Lógica de negócio / chamadas de API
├── types/                      # TypeScript types e interfaces globais
├── utils/                      # Funções puras sem dependências de framework
├── prisma/                     # Schema e migrations
├── public/                     # Assets estáticos
└── ...arquivos de configuração
```

---

## Estrutura Detalhada

```
shareo-app/
│
├── app/                                    # App Router (Next.js 14+)
│   ├── (public)/                           # Route group — rotas públicas (sem auth)
│   │   ├── page.tsx                        # / — Landing page (SSG)
│   │   ├── sobre/page.tsx
│   │   ├── login/page.tsx
│   │   ├── cadastro/page.tsx
│   │   ├── alugar/                         # /alugar — listagem de itens (SSR)
│   │   │   ├── page.tsx
│   │   │   └── [categoria]/               # /alugar/ferramentas (ISR)
│   │   │       ├── page.tsx
│   │   │       └── [slug]/page.tsx        # /alugar/ferramentas/furadeira-natal-rn
│   │   └── perfil/
│   │       └── [userId]/page.tsx          # Perfil público do usuário
│   │
│   ├── (auth)/                             # Route group — rotas autenticadas
│   │   └── dashboard/
│   │       ├── layout.tsx
│   │       ├── page.tsx                    # Dashboard principal (CSR)
│   │       ├── anuncios/
│   │       │   ├── page.tsx               # Meus anúncios
│   │       │   ├── novo/page.tsx          # Criar anúncio
│   │       │   └── [id]/editar/page.tsx   # Editar anúncio
│   │       ├── locacoes/page.tsx           # Minhas locações
│   │       ├── mensagens/
│   │       │   ├── page.tsx               # Lista de conversas
│   │       │   └── [conversationId]/page.tsx
│   │       ├── favoritos/page.tsx
│   │       └── perfil/page.tsx            # Editar perfil
│   │
│   ├── (admin)/                            # Route group — admin only
│   │   └── admin/
│   │       ├── layout.tsx                 # Verifica role === ADMIN
│   │       ├── page.tsx                   # Dashboard admin
│   │       ├── anuncios/page.tsx
│   │       ├── usuarios/page.tsx
│   │       └── locacoes/page.tsx
│   │
│   ├── api/                               # API Routes (Next.js Route Handlers)
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth handler
│   │   ├── items/
│   │   │   ├── route.ts                  # GET (listar) / POST (criar)
│   │   │   └── [id]/route.ts             # GET / PUT / DELETE
│   │   ├── bookings/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── status/route.ts       # PATCH — transições de status
│   │   ├── users/
│   │   │   ├── route.ts                  # POST (cadastro)
│   │   │   └── [id]/route.ts
│   │   ├── reviews/route.ts
│   │   ├── conversations/
│   │   │   ├── route.ts
│   │   │   └── [id]/messages/route.ts
│   │   ├── categories/route.ts
│   │   └── admin/
│   │       ├── items/route.ts
│   │       └── users/route.ts
│   │
│   ├── layout.tsx                         # Root layout (fontes, providers)
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                                # Primitivos do Design System (sem lógica de negócio)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.test.tsx
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Spinner/
│   │   ├── Toast/
│   │   └── index.ts                       # Re-exports
│   │
│   ├── domain/                            # Componentes com lógica de domínio
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── items/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemGrid.tsx
│   │   │   ├── ItemForm.tsx
│   │   │   └── ItemImageUpload.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── map/
│   │   │   ├── ItemsMap.tsx
│   │   │   └── LocationPicker.tsx
│   │   ├── bookings/
│   │   │   ├── BookingForm.tsx
│   │   │   └── BookingStatusBadge.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── MessageInput.tsx
│   │   └── reviews/
│   │       ├── ReviewForm.tsx
│   │       └── ReviewCard.tsx
│   │
│   └── layout/                            # Componentes de layout
│       ├── Header/
│       ├── Footer/
│       ├── Sidebar/
│       └── BottomNav/                     # Navegação mobile
│
├── lib/
│   ├── prisma.ts                          # Singleton do PrismaClient
│   ├── supabase/
│   │   ├── client.ts                      # createBrowserClient
│   │   └── server.ts                      # createServerClient (Server Components)
│   ├── auth.ts                            # Config NextAuth + helpers de sessão
│   ├── validations/                       # Schemas Zod por domínio
│   │   ├── auth.ts
│   │   ├── items.ts
│   │   ├── bookings.ts
│   │   └── users.ts
│   └── crypto.ts                          # Criptografia/descriptografia de CPF/CNPJ
│
├── hooks/
│   ├── useAuth.ts
│   ├── useItems.ts                        # React Query hooks para items
│   ├── useBookings.ts
│   ├── useChat.ts                         # Supabase Realtime subscription
│   ├── useGeolocation.ts                  # browser Geolocation API
│   └── useDebounce.ts
│
├── services/                              # Funções que chamam a API interna (/api/*)
│   ├── items.service.ts
│   ├── bookings.service.ts
│   ├── users.service.ts
│   └── reviews.service.ts
│
├── types/
│   ├── index.ts                           # Re-exports
│   ├── next-auth.d.ts                     # Augment NextAuth types (role, userType)
│   └── api.ts                             # Tipos de request/response das APIs
│
├── utils/
│   ├── cpf.ts                             # Validação de CPF (dígito verificador)
│   ├── cnpj.ts                            # Validação de CNPJ
│   ├── currency.ts                        # Formatação BRL (Intl.NumberFormat)
│   ├── date.ts                            # Helpers de data (duração, formatação)
│   └── geo.ts                             # Distância Haversine (client-side)
│
├── prisma/
│   ├── schema.prisma                      # Schema de banco (ver /prisma/schema.prisma)
│   ├── migrations/                        # Gerado pelo Prisma — não editar manualmente
│   └── seed.ts                            # Dados iniciais (categorias, admin)
│
├── public/
│   ├── icons/                             # Ícones de categoria (SVGs)
│   ├── images/
│   └── fonts/
│
├── .env.example                           # Template de variáveis (commitado)
├── .env.local                             # Valores reais (NO .gitignore)
├── .github/
│   ├── workflows/
│   │   └── ci.yml                         # Pipeline CI/CD
│   └── PULL_REQUEST_TEMPLATE.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Convenções

### Nomenclatura de Arquivos

| Tipo | Convenção | Exemplo |
|---|---|---|
| Componente React | PascalCase | `ItemCard.tsx` |
| Hook | camelCase com prefixo `use` | `useItems.ts` |
| Serviço / utilitário | camelCase com sufixo | `items.service.ts`, `cpf.ts` |
| Schema Zod | camelCase | `auth.ts` dentro de `validations/` |
| Route Handler | `route.ts` | `app/api/items/route.ts` |
| Testes | mesmo nome + `.test.tsx` | `Button.test.tsx` |

### Importações

Usar path alias `@/` para imports absolutos:

```typescript
// ✅ Correto
import { Button } from "@/components/ui/Button"
import { prisma } from "@/lib/prisma"
import { validateCPF } from "@/utils/cpf"

// ❌ Errado
import { Button } from "../../components/ui/Button"
```

### Lógica de Negócio

- **Route Handlers** (`app/api/`): validação Zod, autenticação, orquestração → chamar services/prisma
- **Services** (`services/`): chamam a API interna do próprio app (client-side com React Query)
- **Componentes**: sem chamadas diretas ao Prisma ou Supabase — sempre via API routes
- **Server Components**: podem chamar Prisma diretamente para data fetching (não mutations)

---

## Convenção de Branches

```
main          — produção (protegida, requer PR + review)
develop       — staging (integração contínua)
feat/[slug]   — nova funcionalidade
fix/[slug]    — correção de bug
chore/[slug]  — manutenção (deps, configs, refactor)
hotfix/[slug] — correção urgente em produção
```

**Conventional Commits**:
```
feat: adiciona busca geolocalizada de itens
fix: corrige validação de CNPJ com dígito verificador duplo
chore: atualiza dependências do Prisma para v5.14
docs: documenta ADR-003 de chat
```
