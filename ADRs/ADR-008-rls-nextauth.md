# ADR-008 — Estratégia RLS com NextAuth.js v5 (Bloqueador Crítico)

**Status**: Aceito  
**Data**: 2026-05-25  
**Decisores**: Arquiteto, Analista de Segurança  
**Revisores**: Full Stack Dev  
**Referências**: ADR-001 (autenticação), ADR-003 (chat/RLS), ADR-004 (criptografia)

---

## Contexto

O ADR-001 decidiu usar **NextAuth.js v5** com JWT próprio e Prisma Adapter. O ADR-003 (chat) definiu políticas RLS usando `auth.uid()` — a função nativa do Supabase Auth que retorna o UUID do usuário autenticado pelo Supabase Auth.

**O conflito**: `auth.uid()` só retorna um valor não-nulo quando a conexão ao banco é estabelecida via Supabase Auth (token JWT gerado pelo próprio Supabase). Como o ShareO usa NextAuth.js com JWTs independentes, toda conexão via Prisma (que usa a `DATABASE_URL` diretamente, sem o JWT do Supabase) faz com que `auth.uid()` retorne `null` em 100% das queries. Resultado: qualquer tabela com RLS habilitado bloqueia todos os acessos, incluindo INSERTs e SELECTs legítimos.

Este é um bloqueador direto para F09 (chat em tempo real) e para qualquer dado sensível protegido por RLS.

### Opções avaliadas

**Opção A — Migrar para Supabase Auth**  
Abandona NextAuth.js (ADR-001 aceito) e usa Supabase Auth como provedor de identidade. `auth.uid()` funciona nativamente. Exige reescrever toda a lógica de sessão, callbacks, middleware de proteção de rotas e o adapter Prisma. Desfaz trabalho já especificado e reduz flexibilidade para OAuth providers na H2.

**Opção B — Service Role Key + segurança na camada de API**  
Prisma usa a `service_role` key do Supabase, que bypassa RLS completamente. Toda a segurança de acesso é implementada manualmente nos API Routes do Next.js (verificar `session.user.id` antes de cada query). RLS fica desabilitado ou é "defense in depth" opcional.

**Opção C — `set_config` por sessão Prisma**  
Antes de cada query que exige isolamento por usuário, executar `SELECT set_config('app.current_user_id', $userId, true)` na mesma transação. Políticas RLS usam `current_setting('app.current_user_id')` em vez de `auth.uid()`. Requer um Prisma middleware/extension para injetar o `set_config` automaticamente.

**Opção D — Prisma Middleware como camada de Row Security**  
Desabilitar RLS no Supabase. Implementar isolamento de dados via middleware do Prisma (`prisma.$use`) que injeta cláusulas `where: { userId: session.user.id }` em todas as queries relevantes.

---

## Decisão

**Opção B — Service Role Key no servidor com segurança na camada de API Next.js.**

---

## Justificativa

### Por que não Opção A (Supabase Auth)

ADR-001 foi aceito com justificativas técnicas sólidas: controle total do schema via Prisma, 50+ providers OAuth prontos para H2, adapter oficial. Migrar agora significaria desfazer decisões fundamentadas apenas para resolver um problema de integração que tem solução mais simples. Supabase Auth também cria um schema separado (`auth.users`) que tornaria o modelo de usuário do ShareO (CPF, CNPJ, consentimento LGPD, `userType`) mais complexo de estender.

### Por que não Opção C (`set_config` por sessão)

Tecnicamente viável, mas introduz complexidade operacional significativa no MVP:
- Prisma não tem suporte nativo a `set_config` por transação — exige `$executeRaw` ou extensão customizada
- Cada query sensível exige garantia de que o `set_config` foi executado na mesma sessão de conexão (connection pooling via PgBouncer/Supavisor do Supabase pode invalidar o estado da sessão)
- Difícil de testar e auditar: bugs silenciosos em que o `set_config` não é propagado resultam em dados vazando entre usuários, o que é pior do que um erro explícito
- Adiciona latência a cada query (round-trip extra para `set_config`)

### Por que não Opção D (Prisma Middleware)

Prisma middleware para Row Security é difícil de fazer corretamente para todas as relações (eager loading, includes, agregações). O risco de vazamento de dados via queries aninhadas é alto. Não há garantia de cobertura completa sem testes exaustivos de cada combinação de `include`.

### Por que Opção B

**Clareza de responsabilidades**: a segurança de acesso fica em uma camada explícita e auditável — os API Routes do Next.js — e não distribuída em políticas SQL que dependem de estado de sessão complexo.

**Consistência com a arquitetura**: o projeto já usa NextAuth.js para autenticação. Os Server Actions e API Routes já verificam a sessão via `auth()`. Adicionar verificações de autorização (`session.user.id === resource.ownerId`) nessa mesma camada é natural e testável com Jest.

**Supabase Realtime ainda funciona com RLS**: para o chat (ADR-003), o cliente Supabase no browser pode usar as políticas RLS via Supabase Anon Key com o JWT do NextAuth passado como parâmetro de autorização customizado. Detalhes no item de implementação abaixo.

**Manutenibilidade**: SQL com lógica de autorização é difícil de versionar, testar e rastrear em code review. Autorização em TypeScript é testável via Jest, visível em PRs e refatorável sem migrations.

---

## Implementação

### Configuração do cliente Prisma no servidor

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

A `DATABASE_URL` aponta para a connection string com service role ou com o usuário Prisma que tem permissões completas. **RLS permanece desabilitado** nas tabelas acessadas via Prisma server-side.

### Padrão de autorização em API Routes

```typescript
// Padrão obrigatório em todo API Route que acessa dados de usuário
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const item = await prisma.item.findUnique({ where: { id: params.id } })
  if (!item) return Response.json({ error: "Not Found" }, { status: 404 })

  // Autorização explícita — nunca assume que o recurso pertence ao usuário
  if (item.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return Response.json(item)
}
```

### Supabase Realtime com autorização client-side (chat)

O cliente Supabase no browser usa a `SUPABASE_ANON_KEY` e realtime. Para evitar que um usuário receba mensagens de outra conversa, a filtragem acontece em duas camadas:
1. **Filtro de channel**: `filter: \`conversation_id=eq.${conversationId}\`` no subscribe
2. **Verificação no API Route de carregamento do histórico**: garante que o `conversationId` pertence ao usuário antes de retornar dados

```typescript
// Verificação server-side antes de autorizar acesso à conversa
const participant = await prisma.conversationParticipant.findUnique({
  where: {
    conversationId_userId: {
      conversationId,
      userId: session.user.id,
    },
  },
})
if (!participant) return Response.json({ error: "Forbidden" }, { status: 403 })
```

O cliente Supabase no browser **não** usa RLS — usa a anon key apenas para o canal Realtime de broadcast, com filtragem por `conversation_id`. O payload de cada mensagem não contém dados sensíveis além do conteúdo da mensagem — que só chega ao cliente se ele já passou pela verificação server-side.

### Política de bucket no Supabase Storage

Para uploads de imagens (ADR-009), o Supabase Storage usa políticas de bucket separadas de RLS de tabelas. Essas políticas continuam válidas pois usam o JWT do usuário Supabase Anon (não `auth.uid()`).

---

## Consequências

**Positivas**:
- Zero conflito com NextAuth.js v5 — a decisão do ADR-001 é preservada integralmente
- Autorização 100% testável via Jest (sem precisar simular contexto de sessão PostgreSQL)
- Code review completo de toda lógica de acesso a dados — auditável linha a linha
- Sem latência extra por `set_config` em cada query
- Compatível com connection pooling (PgBouncer/Supavisor) sem comportamentos inesperados

**Negativas**:
- Sem "defense in depth" via RLS: um bug na camada de API pode vazar dados — mitigado por testes de integração obrigatórios
- Desenvolvedores devem seguir o padrão de autorização explícita em 100% dos API Routes — requer code review rigoroso
- Supabase Realtime client-side não tem RLS como segunda barreira — mitigado pelo filtro por `conversation_id` e pela verificação server-side antes do subscribe

---

## Alternativas Rejeitadas

| Opção | Motivo da rejeição |
|---|---|
| A — Supabase Auth | Desfaz ADR-001; reduz controle do schema de usuário; menos providers OAuth para H2 |
| C — `set_config` por sessão | Incompatível com connection pooling; difícil de testar; bugs silenciosos podem vazar dados |
| D — Prisma Middleware | Cobertura incompleta em queries com `include`; alto risco de vazamento em relações aninhadas |

---

## Itens em Aberto

- [ ] Criar helper `requireAuth(req)` reutilizável para eliminar boilerplate de verificação de sessão
- [ ] Criar helper `requireOwnership(resource, userId)` para verificações de propriedade de recurso
- [ ] Avaliar habilitação de RLS seletiva para tabelas de baixo risco quando Prisma suportar `set_config` nativamente — H2
- [ ] Documentar padrão de autorização no CLAUDE.md como regra de contribuição obrigatória
