# ADR-007 — Estratégia de Renderização por Tipo de Página

**Status**: Aceito  
**Data**: 2026-05-25  
**Decisores**: Arquiteto, SEO, Full Stack Dev  
**Revisores**: DevOps, QA  
**Referências**: ADR-005 (estrutura de pastas), CLAUDE.md (metas Core Web Vitals)

---

## Contexto

O Next.js App Router suporta quatro estratégias de renderização por rota:
- **SSG** (Static Site Generation): HTML gerado em build time, servido via CDN. Zero latência, máximo cache.
- **ISR** (Incremental Static Regeneration): SSG com revalidação periódica. Cache vive por N segundos, depois é regenerado em background.
- **SSR** (Server-Side Rendering): HTML gerado por request. Dados sempre frescos, sem cache de página.
- **CSR** (Client-Side Rendering): HTML vazio no servidor; dados carregados no browser. Não indexável pelo Google.

**Regra inviolável**: conteúdo indexável pelo Google (listagens, detalhe de item, categorias) nunca deve ser renderizado apenas no cliente (CSR). Uma página CSR retorna HTML vazio para o Googlebot, resultando em não-indexação e impacto direto no crescimento orgânico do ShareO.

O ShareO tem metas explícitas de Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms. A escolha de estratégia de renderização impacta diretamente o LCP.

---

## Mapeamento por Feature

### F01 — Landing Page (página inicial)
**Estratégia**: SSG  
**Justificativa**: Conteúdo estático (hero, categorias, proposta de valor). Não depende de usuário ou dados dinâmicos. Servido via CDN Vercel — LCP mínimo. Requer rebuild ao mudar copy ou design.  
**Cache**: Indefinido (requer deploy para atualizar)  
**Arquivo**: `app/(public)/page.tsx`

### F02 — Páginas Institucionais (Sobre, Como Funciona, FAQ)
**Estratégia**: SSG  
**Justificativa**: Conteúdo editorial, alterado raramente. Zero queries ao banco.  
**Cache**: Indefinido  
**Arquivos**: `app/(public)/sobre/page.tsx`, `app/(public)/como-funciona/page.tsx`

### F03 — Listagem de Itens com Filtros Geográficos (`/alugar`)
**Estratégia**: SSR  
**Justificativa**: Filtros de geolocalização (lat/lng do usuário ou cidade digitada), categoria, preço mínimo/máximo e disponibilidade são parâmetros dinâmicos passados via query string. Não é possível pré-renderizar todas as combinações de filtros em build time. Dados precisam ser frescos (item pode ser alugado minutos atrás). Esta é a página mais crítica para SEO — deve retornar HTML completo com resultados para o Googlebot.  
**Cache**: `no-store` (Next.js padrão para SSR com `searchParams`)  
**Arquivo**: `app/(public)/alugar/page.tsx`

```typescript
// Exemplo de implementação SSR com searchParams
export default async function AlugarPage({
  searchParams,
}: {
  searchParams: { cidade?: string; categoria?: string; lat?: string; lng?: string }
}) {
  const items = await getItemsByFilters(searchParams) // query ao banco server-side
  return <ItemGrid items={items} />
}
```

### F04 — Detalhe do Item (`/alugar/[slug]`)
**Estratégia**: ISR (revalidate: 60 segundos)  
**Justificativa**: O conteúdo de um item (título, descrição, fotos, preço) muda raramente — principalmente quando o owner edita o anúncio. ISR com 60s de revalidação garante que edições apareçam em no máximo 1 minuto sem sobrecarregar o banco com SSR por request. Página crítica para SEO (schema.org `Product`, Open Graph para compartilhamento).  
**Cache**: 60 segundos, revalidação em background (stale-while-revalidate)  
**Arquivo**: `app/(public)/alugar/[slug]/page.tsx`

```typescript
export const revalidate = 60 // ISR: revalida a cada 60 segundos

export default async function ItemPage({ params }: { params: { slug: string } }) {
  const item = await getItemBySlug(params.slug)
  return <ItemDetail item={item} />
}
```

### F05 — Listagem por Categoria e Cidade (`/categoria/[slug]`)
**Estratégia**: ISR (revalidate: 300 segundos)  
**Justificativa**: Páginas de categoria como `/categoria/ferramentas?cidade=sao-paulo` são indexáveis e têm alto valor de SEO (long-tail). O conteúdo muda conforme novos itens são publicados, mas 5 minutos de defasagem são aceitáveis. `generateStaticParams` pode pré-gerar as combinações mais populares (top 20 categorias × top 10 cidades) em build time.  
**Cache**: 300 segundos  
**Arquivo**: `app/(public)/categoria/[slug]/page.tsx`

### F06 — Busca com Filtros Avançados
**Estratégia**: SSR (mesma rota que F03, parâmetros via searchParams)  
**Justificativa**: Filtros adicionais (condição, raio de distância, disponibilidade de data) são parâmetros dinâmicos. Sem possibilidade de cache significativo.

### F07 — Perfil Público do Usuário (`/perfil/[id]`)
**Estratégia**: ISR (revalidate: 300 segundos)  
**Justificativa**: Perfis públicos são indexáveis e relevantes para SEO (nome do owner, avaliações, itens publicados). Dados mudam raramente.  
**Cache**: 300 segundos

### F08 — Solicitação de Aluguel (Booking)
**Estratégia**: CSR  
**Justificativa**: Formulário de solicitação requer autenticação obrigatória — não é indexável e não existe sem sessão. Dados de disponibilidade precisam ser frescos (verificar conflito de datas client-side antes do submit).  
**Arquivo**: `app/(auth)/alugueis/novo/page.tsx` + `BookingForm.tsx` com `"use client"`

### F09 — Chat em Tempo Real
**Estratégia**: CSR  
**Justificativa**: Requer autenticação, WebSocket (Supabase Realtime), estado em tempo real. Não indexável por definição — conteúdo privado entre dois usuários. SSR adicionaria latência sem benefício.  
**Arquivo**: `app/(auth)/chat/[conversationId]/page.tsx`

### F10 — Dashboard do Locador (meus itens, solicitações)
**Estratégia**: CSR  
**Justificativa**: Dados privados do usuário autenticado. Combinação de dados de múltiplas fontes (itens, bookings pendentes, notificações) melhor servida com React Query no cliente para permitir refetch automático (ex.: nova solicitação aparece sem refresh).  
**Arquivo**: `app/(auth)/dashboard/page.tsx`

### F11 — Favoritos
**Estratégia**: CSR  
**Justificativa**: Lista privada do usuário. Operações de add/remove devem ser otimistas (UX) — React Query com `useMutation` e optimistic updates.

### F12 — Dashboard do Locatário (minhas locações)
**Estratégia**: CSR  
**Justificativa**: Dados privados. Mesmo raciocínio do F10.

### F13 — Painel Admin
**Estratégia**: CSR  
**Justificativa**: Acesso restrito a `role: ADMIN`. Dados de gestão (usuários, itens pendentes, disputas) mudam em tempo real. React Query com polling de 30s para notificações de novas disputas.  
**Arquivo**: `app/(admin)/admin/page.tsx`

### F14 — Notificações
**Estratégia**: CSR  
**Justificativa**: Privadas, em tempo real via Supabase Realtime. Integradas ao layout autenticado como componente global.

---

## Tabela Resumo

| Feature | Rota | Estratégia | Revalidate | Indexável |
|---|---|---|---|---|
| F01 Landing | `/` | SSG | ∞ | Sim |
| F02 Institucional | `/sobre`, `/como-funciona` | SSG | ∞ | Sim |
| F03 Listagem geo | `/alugar` | SSR | no-store | Sim |
| F04 Detalhe item | `/alugar/[slug]` | ISR | 60s | Sim |
| F05 Categoria/cidade | `/categoria/[slug]` | ISR | 300s | Sim |
| F06 Filtros avançados | `/alugar?filtros=...` | SSR | no-store | Sim |
| F07 Perfil público | `/perfil/[id]` | ISR | 300s | Sim |
| F08 Booking form | `/alugueis/novo` | CSR | — | Não |
| F09 Chat | `/chat/[id]` | CSR | — | Não |
| F10 Dashboard locador | `/dashboard` | CSR | — | Não |
| F11 Favoritos | `/favoritos` | CSR | — | Não |
| F12 Dashboard locatário | `/alugueis` | CSR | — | Não |
| F13 Admin | `/admin` | CSR | — | Não |
| F14 Notificações | (componente global) | CSR | — | Não |

---

## Regras Obrigatórias

### Regra 1 — Conteúdo indexável nunca é CSR
Qualquer página com URL pública (sem autenticação obrigatória) deve retornar HTML com conteúdo para o Googlebot. Violação desta regra resulta em não-indexação e impacto direto no crescimento orgânico.

**Verificação**: executar `curl -A "Googlebot" https://shareo.com.br/alugar/item-slug` — deve retornar o título e descrição do item no HTML, não apenas `<div id="root"></div>`.

### Regra 2 — `loading.tsx` obrigatório em rotas SSR
Rotas SSR têm latência variável. Cada rota SSR deve ter um `loading.tsx` com skeleton components para evitar tela em branco durante o stream de HTML.

### Regra 3 — `generateStaticParams` para ISR com slugs conhecidos
Páginas ISR com parâmetros dinâmicos devem implementar `generateStaticParams` para pré-gerar as variantes mais comuns em build time (fallback: `blocking` para slugs não pré-gerados).

```typescript
// app/(public)/alugar/[slug]/page.tsx
export async function generateStaticParams() {
  const items = await prisma.item.findMany({
    where: { isActive: true, isApproved: true },
    select: { slug: true },
    orderBy: { viewCount: "desc" },
    take: 500, // pré-gera top 500 itens mais visitados
  })
  return items.map((item) => ({ slug: item.slug }))
}

export const dynamicParams = true // slugs não pré-gerados são gerados on-demand
```

### Regra 4 — `Suspense` wrapping para componentes CSR em páginas SSR/ISR
Componentes Client que dependem de dados do usuário (ex.: botão "Favoritar" em página de detalhe ISR) devem ser envoltos em `<Suspense>` para não bloquear a renderização estática da página.

---

## Consequências

**Positivas**:
- Landing e páginas de categoria servidas via CDN Vercel — LCP < 1s para usuários na região do CDN
- Páginas de item e listagem totalmente indexáveis — suporte ao crescimento orgânico via SEO
- Dashboard e chat CSR com React Query — UX de app (dados frescos, sem refresh manual)

**Negativas**:
- SSR para `/alugar` adiciona latência server-side (~100–300ms para query geo) — mitigado por índices PostGIS
- ISR com `revalidate: 60s` pode mostrar dados levemente desatualizados — aceitável para MVP (item já alugado aparece disponível por até 60s)
- `generateStaticParams` para itens requer rebuild periódico ou limite nos 500 mais visitados

---

## Itens em Aberto

- [ ] Definir `slug` no schema.prisma do Item (campo a adicionar na migration)
- [ ] Decidir comportamento de ISR quando item é deletado (soft delete) — rota deve retornar 404 via `notFound()`
- [ ] Avaliar `on-demand revalidation` via `revalidatePath()` quando item é editado — elimina defasagem do ISR em edições explícitas
