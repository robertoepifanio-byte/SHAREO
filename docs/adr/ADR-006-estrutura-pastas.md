# ADR-006 — Estrutura de Pastas e Convenções de Componentes

**Status**: Aceito  
**Data**: 2026-05-25  
**Decisores**: Arquiteto, Full Stack Dev, Designer  
**Revisores**: QA  
**Referências**: ADR-001 (auth), ADR-006 (rendering strategy), CLAUDE.md

---

## Contexto

O projeto não tem código de aplicação ainda. Antes do primeiro componente ser escrito, é necessário definir:
1. Como organizar `app/` com App Router e rotas protegidas
2. Como organizar `components/` para escalar sem conflito entre features
3. Onde ficam utilitários, tipos, hooks e configurações de biblioteca
4. Qual biblioteca base de componentes usar para não reinventar acessibilidade
5. Convenções de nomenclatura para arquivos e componentes

Sem essas convenções definidas antecipadamente, projetos Next.js com App Router tendem a acumular:
- Componentes com `"use client"` desnecessário em layouts (degrada performance de hidratação)
- Lógica de negócio misturada com UI em arquivos grandes
- Imports circulares entre features

---

## Decisão

### Biblioteca base de componentes: **shadcn/ui**

shadcn/ui foi escolhido por:
- Componentes acessíveis por padrão (construídos sobre Radix UI primitives) — reduz ~60% do trabalho de WCAG 2.1 AA no Sprint 1
- Código copiado para o projeto (não instalado como dependência opaca) — total controle sobre customização de tokens do design system
- Integração nativa com Tailwind CSS — todos os componentes usam classes Tailwind, compatível com o `tailwind.config.ts` do projeto
- Comunidade ativa, CLI `shadcn-ui add` para instalar componentes seletivamente
- Componentes que o ShareO precisará no Sprint 1: Button, Input, Dialog, Sheet (bottom drawer mobile), Select, Badge, Avatar, Skeleton, Toast — todos disponíveis

---

## Estrutura de Pastas

```
shareo/                           # raiz do repositório
├── app/                          # Next.js App Router
│   ├── (public)/                 # Route group — páginas sem autenticação
│   │   ├── layout.tsx            # Layout público (Header + Footer)
│   │   ├── page.tsx              # Landing page (SSG)
│   │   ├── alugar/
│   │   │   ├── page.tsx          # Listagem com filtros geo (SSR)
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Detalhe do item (ISR)
│   │   ├── categoria/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Listagem por categoria/cidade (ISR)
│   │   └── sobre/
│   │       └── page.tsx          # Página institucional (SSG)
│   │
│   ├── (auth)/                   # Route group — páginas autenticadas
│   │   ├── layout.tsx            # Layout autenticado (Sidebar + Header)
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Dashboard do usuário (CSR)
│   │   ├── meus-itens/
│   │   │   ├── page.tsx          # Itens do locador (CSR)
│   │   │   ├── novo/
│   │   │   │   └── page.tsx      # Criar item (CSR)
│   │   │   └── [id]/
│   │   │       └── editar/
│   │   │           └── page.tsx  # Editar item (CSR)
│   │   ├── alugueis/
│   │   │   └── page.tsx          # Histórico de alugueis (CSR)
│   │   ├── chat/
│   │   │   ├── page.tsx          # Lista de conversas (CSR)
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx      # Conversa individual (CSR)
│   │   ├── favoritos/
│   │   │   └── page.tsx          # Favoritos (CSR)
│   │   └── perfil/
│   │       └── page.tsx          # Perfil do usuário (CSR)
│   │
│   ├── (admin)/                  # Route group — painel administrativo
│   │   ├── layout.tsx            # Layout admin (Sidebar admin)
│   │   └── admin/
│   │       ├── page.tsx          # Dashboard admin (CSR)
│   │       ├── usuarios/
│   │       │   └── page.tsx
│   │       └── itens/
│   │           └── page.tsx
│   │
│   ├── login/
│   │   └── page.tsx              # Página de login (fora dos route groups — sem layout wrapper)
│   ├── cadastro/
│   │   └── page.tsx              # Cadastro (fora dos route groups)
│   │
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # Handler NextAuth.js
│   │   ├── items/
│   │   │   ├── route.ts          # GET /api/items, POST /api/items
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET/PUT/DELETE /api/items/[id]
│   │   ├── bookings/
│   │   │   └── route.ts
│   │   ├── users/
│   │   │   └── route.ts
│   │   └── upload/
│   │       └── route.ts          # Upload de imagens (Supabase Storage)
│   │
│   ├── layout.tsx                # Root layout (providers, fonts, metadata)
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                       # Primitivos reutilizáveis (shadcn/ui + customizados)
│   │   ├── button.tsx            # Instalado via: npx shadcn-ui@latest add button
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   └── ...                   # Outros primitivos shadcn/ui conforme necessidade
│   │
│   ├── features/                 # Componentes de domínio agrupados por feature
│   │   ├── items/
│   │   │   ├── ItemCard.tsx      # Card de item na listagem
│   │   │   ├── ItemGrid.tsx      # Grid de ItemCards
│   │   │   ├── ItemForm.tsx      # Formulário criar/editar item
│   │   │   ├── ItemImages.tsx    # Carrossel de imagens
│   │   │   └── ItemFilters.tsx   # Filtros de busca (geo, categoria, preço)
│   │   ├── bookings/
│   │   │   ├── BookingCard.tsx
│   │   │   ├── BookingForm.tsx   # Formulário de solicitação de aluguel
│   │   │   └── BookingStatus.tsx # Badge de status
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx    # Janela principal do chat
│   │   │   ├── MessageList.tsx   # Lista de mensagens
│   │   │   ├── MessageInput.tsx  # Input de mensagem ("use client")
│   │   │   └── ConversationList.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── UserMenu.tsx      # Dropdown de usuário logado
│   │   └── reviews/
│   │       ├── ReviewCard.tsx
│   │       └── ReviewForm.tsx
│   │
│   ├── layout/                   # Estrutura macro da interface
│   │   ├── Header.tsx            # Header público
│   │   ├── HeaderAuth.tsx        # Header autenticado
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx           # Sidebar do dashboard
│   │   ├── SidebarAdmin.tsx
│   │   └── BottomNav.tsx         # Navegação mobile (bottom bar)
│   │
│   └── shared/                   # Componentes usados em múltiplos features
│       ├── GeoSearch.tsx         # Input de busca com geolocalização
│       ├── MapView.tsx           # Mapa (Mapbox/Google Maps)
│       ├── CategoryIcon.tsx      # Ícones SVG de categoria
│       ├── PriceDisplay.tsx      # Formatação de preço em centavos
│       ├── UserAvatar.tsx        # Avatar com fallback de iniciais
│       ├── EmptyState.tsx        # Estado vazio reutilizável
│       ├── ErrorBoundary.tsx     # Error boundary React
│       └── LoadingSpinner.tsx
│
├── lib/                          # Configurações de bibliotecas externas
│   ├── prisma.ts                 # Singleton do PrismaClient
│   ├── auth.ts                   # Configuração do NextAuth.js (authConfig + auth())
│   ├── supabase.ts               # Clientes Supabase (server + client browser)
│   ├── supabase-server.ts        # createServerClient() para Server Components
│   └── query-client.ts           # Configuração do TanStack Query (staleTime, retry)
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Acesso à sessão do usuário
│   ├── useGeolocation.ts         # Geolocalização do navegador
│   ├── useChat.ts                # Subscribe ao Supabase Realtime
│   ├── useDebounce.ts            # Debounce para inputs de busca
│   └── useMediaQuery.ts          # Breakpoints responsivos
│
├── utils/                        # Funções puras sem efeitos colaterais
│   ├── format.ts                 # Formatação de preços, datas, distâncias
│   ├── geo.ts                    # Cálculo de distância, formatação de coordenadas
│   ├── validation.ts             # Schemas Zod reutilizáveis (CPF, CNPJ, etc.)
│   └── cn.ts                     # Utilitário clsx + tailwind-merge (shadcn/ui padrão)
│
├── types/                        # TypeScript interfaces e tipos
│   ├── index.ts                  # Re-exports de todos os tipos
│   ├── auth.ts                   # Extensão do NextAuth Session type
│   ├── items.ts                  # Item, ItemImage, ItemWithOwner
│   ├── bookings.ts               # Booking, BookingWithDetails
│   ├── chat.ts                   # Message, Conversation, ConversationParticipant
│   └── api.ts                    # Tipos de request/response das API routes
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   ├── icones/                   # SVGs de categorias (já existentes)
│   └── images/
│
├── __tests__/                    # Testes unitários e de integração (Jest)
│   ├── unit/
│   │   └── utils/
│   └── integration/
│       └── api/
│
├── e2e/                          # Testes E2E (Playwright)
│   ├── auth.spec.ts
│   ├── items.spec.ts
│   └── booking.spec.ts
│
├── src/
│   └── mocks/                    # MSW handlers para testes
│       ├── server.ts
│       └── handlers.ts
│
└── .claude/
    └── Agents/                   # Subagentes Claude Code
```

---

## Convenções de Nomenclatura

### Arquivos
- **kebab-case** para todos os arquivos não-componente: `query-client.ts`, `booking-status.ts`
- **PascalCase** para arquivos de componente React: `ItemCard.tsx`, `BookingForm.tsx`
- **camelCase** para hooks: `useChat.ts`, `useGeolocation.ts`
- **kebab-case** para rotas e páginas Next.js: `page.tsx`, `layout.tsx`, `not-found.tsx`

### Componentes React
- **PascalCase** obrigatório para exports de componentes: `export function ItemCard()`
- **camelCase** para props e variáveis internas
- Componentes de servidor: sem prefixo especial
- Componentes de cliente: sem prefixo especial (a directiva `"use client"` já identifica)

### API Routes
- Verbos HTTP mapeados para funções nomeadas: `export async function GET()`, `POST()`, `PUT()`, `DELETE()`
- Arquivo sempre `route.ts` no diretório da rota

---

## Regra de "use client"

**Regra obrigatória**: `"use client"` somente em **leaf nodes interativos** — componentes que usam hooks de estado, efeitos ou event handlers do browser.

**Nunca** em:
- `layout.tsx` (qualquer nível)
- `page.tsx` (salvo exceção documentada com comentário `// use client: necessário porque [razão]`)
- Componentes de container que apenas recebem dados e passam para filhos

**Sim** em:
- Formulários com `useState` + `useForm`
- Componentes com `useEffect`
- Componentes com event listeners (`onClick`, `onChange`, etc.)
- `useChat.ts` e qualquer hook com `useEffect`

**Padrão para formulários**: o componente `page.tsx` é Server Component e busca dados iniciais; importa um `*Form.tsx` que é Client Component e contém toda a lógica interativa.

```typescript
// ✅ Correto: page.tsx é Server Component
// app/(public)/alugar/page.tsx
import { ItemFilters } from "@/components/features/items/ItemFilters"
import { getItems } from "@/lib/items"

export default async function AlugarPage() {
  const initialItems = await getItems()
  return <ItemFilters initialItems={initialItems} /> // ItemFilters tem "use client"
}

// ✅ Correto: Client Component no leaf
// components/features/items/ItemFilters.tsx
"use client"
import { useState } from "react"
// ...

// ❌ Errado: "use client" em layout
// app/(auth)/layout.tsx
"use client" // PROIBIDO — nunca aqui
```

---

## Decisão sobre Biblioteca Base: shadcn/ui

### Justificativa

| Critério | shadcn/ui | Radix UI puro | HeadlessUI | From scratch |
|---|---|---|---|---|
| Acessibilidade WCAG 2.1 AA | Alta (Radix primitives) | Alta | Média | Depende do dev |
| Esforço de implementação | Baixo (CLI) | Médio (montar manualmente) | Médio | Alto |
| Customização de tokens | Total (código no projeto) | Total | Parcial | Total |
| Integração Tailwind | Nativa | Manual | Manual | Manual |
| Redução de trabalho a11y Sprint 1 | ~60% | ~40% | ~30% | 0% |
| Dependência opaca | Não (código copiado) | Sim (npm package) | Sim (npm package) | Não |

**Conclusão**: shadcn/ui é a opção que maximiza acessibilidade com mínimo esforço no Sprint 1, sem introduzir dependência opaca. O código dos componentes fica em `components/ui/` e pode ser modificado livremente.

### Componentes a instalar no Sprint 0

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label textarea select badge avatar skeleton dialog sheet toast separator
```

---

## Consequências

**Positivas**:
- Estrutura clara separa concerns: `ui/` (primitivos), `features/` (domínio), `layout/` (estrutura), `shared/` (cross-cutting)
- Route groups isolam contextos de autenticação sem duplicar layouts
- Regra de `"use client"` em leaf nodes garante máxima renderização no servidor (melhor LCP)
- shadcn/ui elimina implementação manual de Dialog, Select, Toast acessíveis

**Negativas**:
- Custo inicial de configuração do shadcn/ui (CLI de init + customização de tokens)
- Desenvolvedores precisam conhecer a distinção Server/Client Component do App Router

---

## Itens em Aberto

- [ ] Definir convenção de `loading.tsx` por route group (Suspense boundaries)
- [ ] Definir convenção de `error.tsx` por route group (Error boundaries)
- [ ] Avaliar colocation de testes: `__tests__/` centralizado vs. `*.test.ts` ao lado do arquivo — decisão QA
