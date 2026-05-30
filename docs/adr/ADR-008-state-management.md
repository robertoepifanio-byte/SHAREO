# ADR-008 — Gestão de Estado

**Status**: Aceito  
**Data**: 2026-05-25  
**Decisores**: Arquiteto, Full Stack Dev  
**Revisores**: QA  
**Referências**: ADR-001 (auth), ADR-003 (chat), ADR-005 (estrutura), ADR-006 (rendering)

---

## Contexto

O ShareO tem quatro categorias de estado que precisam ser gerenciadas:

1. **Server state**: dados do banco (itens, bookings, mensagens, perfil) — assíncrono, cacheável, sincronizado com o servidor
2. **Auth state**: sessão do usuário (id, nome, role, userType) — global, persistente via cookie
3. **UI state**: modais abertos, drawers, loading indicators, toasts — local ou semi-global
4. **Search/filter state**: filtros de busca (cidade, categoria, preço, raio) — sincronizado com URL

O stack já inclui **React Query (TanStack Query)** para server state (definido no planejamento). A questão é: além do React Query, é necessário adicionar **Zustand** (ou Context API) para os demais tipos de estado?

---

## Decisão

**React Query para server state. Context API para auth state. URL state para filtros de busca. Sem Zustand no MVP.**

---

## Justificativa

### Avaliação do Zustand para o ShareO MVP

Zustand é justificado quando:
- Existe estado global complexo compartilhado entre múltiplas partes não relacionadas da árvore de componentes
- O estado sofre mutações frequentes e renderizações otimizadas são necessárias (seletores)
- Há lógica de negócio no estado (ex.: máquina de estados de carrinho com middleware de validação)

Para o ShareO MVP, avaliando cada tipo de estado:

**Estado de busca/filtros**: deve viver na URL (`/alugar?cidade=sp&categoria=ferramentas&preco_max=100`). URLs são compartilháveis, funciona com botão "voltar" do browser, é indexável. `useSearchParams()` do Next.js é suficiente — sem necessidade de store.

**Estado de solicitação de aluguel (booking form)**: estado local do formulário com `react-hook-form` + `useState`. Não é compartilhado entre componentes não relacionados. Sem necessidade de store global.

**Estado do chat**: gerenciado pelo hook `useChat` (ADR-003) com `useState` local + Supabase Realtime. Não precisa de store global — cada instância do chat tem seu próprio estado.

**Estado de auth**: NextAuth.js expõe `useSession()` (Client Component) e `auth()` (Server Component/API Route). Não é necessário duplicar em Zustand — a sessão já é gerenciada pelo NextAuth com cookie httpOnly.

**UI state (modais, drawers)**: componentes individuais como `<Dialog>` e `<Sheet>` do shadcn/ui são controlados com `useState` local no componente pai. Em casos raros de modal disparado de múltiplos pontos distantes na árvore, um Context simples é suficiente.

**Conclusão**: nenhum dos casos de uso do MVP justifica a adição de Zustand. Context API cobre os poucos casos de estado global (toast notifications, auth). Adicionar Zustand aumentaria o bundle e criaria uma terceira camada de estado desnecessária no MVP.

---

## Convenções por Camada de Estado

### 1. Server State — React Query (TanStack Query)

React Query é a fonte de verdade para todos os dados do servidor.

#### Configuração global (`lib/query-client.ts`)

```typescript
import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // 60 segundos — evita refetch imediato ao montar
        gcTime: 5 * 60 * 1000,      // 5 minutos — GC após inatividade (ex-cacheTime)
        retry: 1,                    // 1 retry em falha (não 3 — evita sobrecarregar API)
        refetchOnWindowFocus: false, // não refetcha ao alt+tab (reduz ruído)
      },
      mutations: {
        retry: 0,                    // mutations não fazem retry automático
      },
    },
  })
}
```

#### Convenção de query keys

Query keys devem ser arrays descritivos, do geral para o específico:

```typescript
// lib/query-keys.ts — fonte única de verdade para query keys
export const queryKeys = {
  items: {
    all: () => ["items"] as const,
    list: (filters: ItemFilters) => ["items", "list", filters] as const,
    detail: (id: string) => ["items", "detail", id] as const,
    byOwner: (ownerId: string) => ["items", "by-owner", ownerId] as const,
  },
  bookings: {
    all: () => ["bookings"] as const,
    list: (userId: string) => ["bookings", "list", userId] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
  },
  conversations: {
    list: (userId: string) => ["conversations", "list", userId] as const,
    messages: (conversationId: string) => ["conversations", "messages", conversationId] as const,
  },
  user: {
    profile: (id: string) => ["user", "profile", id] as const,
    favorites: (userId: string) => ["user", "favorites", userId] as const,
  },
} as const
```

#### Stale times por tipo de dado

| Tipo de dado | staleTime | Justificativa |
|---|---|---|
| Listagem de itens | 60s | Dados mudam com frequência moderada |
| Detalhe de item | 60s | Sincronizado com ISR (revalidate: 60s) |
| Bookings do usuário | 30s | Mudanças de status são críticas |
| Mensagens do chat | 0s | Realtime via Supabase — React Query apenas carrega histórico inicial |
| Perfil do usuário | 300s | Muda raramente |
| Categorias | Infinity | Dados estáticos — cachear para sempre |

#### Error Boundaries com React Query

Cada seção crítica da interface deve ter um Error Boundary que captura erros de queries:

```typescript
// Padrão para seções críticas
import { QueryErrorResetBoundary } from "@tanstack/react-query"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

export function ItemsSection() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={<ErrorMessage onRetry={reset} />}>
          <Suspense fallback={<ItemGridSkeleton />}>
            <ItemGrid />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

### 2. Auth State — NextAuth.js Session

A sessão é gerenciada pelo NextAuth.js. Não duplicar em nenhum store.

```typescript
// Em Server Components / API Routes
import { auth } from "@/auth"
const session = await auth()
const userId = session?.user?.id

// Em Client Components
import { useSession } from "next-auth/react"
const { data: session, status } = useSession()
```

O `SessionProvider` do NextAuth é adicionado no root layout (`app/layout.tsx`) e expõe a sessão via Context internamente.

### 3. URL State — Filtros de Busca

Todos os filtros de busca e paginação vivem na URL via `searchParams`:

```typescript
// URL: /alugar?cidade=sao-paulo&categoria=ferramentas&preco_max=10000&pagina=2

// Em page.tsx (Server Component)
export default async function AlugarPage({
  searchParams,
}: {
  searchParams: { cidade?: string; categoria?: string; preco_max?: string; pagina?: string }
}) {
  // Filtra diretamente da URL — sem estado global
}

// Em ItemFilters.tsx (Client Component) — atualiza URL sem reload
"use client"
import { useRouter, useSearchParams } from "next/navigation"

function ItemFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`/alugar?${params.toString()}`)
  }
}
```

### 4. UI State — Local e Context

**Estado puramente local** (drawer aberto/fechado, tab ativa, accordion): `useState` no componente pai imediato.

**Toast notifications** (feedback de operações como "Item criado com sucesso"): Context global usando o `<Toaster>` do shadcn/ui + `useToast()` hook. Zero Zustand.

**Modal de confirmação de ação destrutiva**: `useState` no componente que dispara a ação + prop drilling máximo de 2 níveis. Se precisar de mais, extrair para Context do feature.

---

## Estrutura do Provider Stack

```typescript
// app/layout.tsx (Server Component)
import { SessionProvider } from "next-auth/react"
import { QueryProvider } from "@/lib/query-provider"
import { Toaster } from "@/components/ui/toast"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
```

```typescript
// lib/query-provider.tsx ("use client" — necessário para TanStack Query)
"use client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"
import { makeQueryClient } from "./query-client"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

---

## Reavaliação do Zustand (Critérios para H2)

Zustand deve ser adicionado se, no H2 ou H3, surgir qualquer um destes cenários:
- Carrinho/checkout multi-step com estado persistido entre páginas (ex.: integração Stripe)
- Fluxo de upload em progresso visível globalmente (barra de progresso no header enquanto envia fotos)
- Estado de notificações push com badge counter global que precise ser atualizado de múltiplos pontos
- Dashboard com widgets que compartilham estado de filtro de data global

Para o MVP H1, nenhum desses cenários existe.

---

## Consequências

**Positivas**:
- Bundle menor: sem Zustand (~3KB gzip) no MVP
- Menos camadas de abstração: dev precisa aprender apenas React Query + useSession + useSearchParams
- Filtros na URL: compartilháveis, funcionam com history API, indexáveis (sem estado fantasma)
- React Query centraliza todos os dados do servidor com cache, retry e invalidação automáticos

**Negativas**:
- Se o H2 introduzir estado global complexo (ex.: checkout), será necessário adicionar Zustand depois — mitigado pelo fato de que adicionar Zustand é não-disruptivo
- Prop drilling de até 2 níveis para UI state local — aceitável no MVP

---

## Itens em Aberto

- [ ] Definir estratégia de `prefetchQuery` em Server Components para hydration (evitar waterfall no dashboard)
- [ ] Definir `invalidateQueries` pattern para mutações (ex.: ao criar item, invalidar `queryKeys.items.list()`)
- [ ] Avaliar `@tanstack/react-query-next-experimental` quando estabilizar para Server Components com streaming
