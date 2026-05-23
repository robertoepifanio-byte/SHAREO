# Contratos de API — Chat

**Base**: `/api/conversations` · **Auth**: obrigatória em todos os endpoints

---

## Arquitetura

Mensagens são enviadas via **API Route** (Prisma → PostgreSQL) e recebidas em tempo real via **Supabase Realtime** (Postgres Changes INSERT na tabela `messages`). Ver ADR-003 para detalhes do canal Realtime.

```
[Cliente]
   ├── POST /api/conversations/:id/messages  → envia (API Route)
   └── Supabase Realtime subscription         → recebe (WebSocket)
```

---

## GET /api/conversations

**Lista conversas do usuário autenticado**, ordenadas por `lastMessageAt` desc.

### Response `200`

```typescript
{
  data: {
    id:             string
    lastMessageAt:  string | null
    unreadCount:    number   // mensagens com readAt=null do outro participante
    booking?: {
      id:           string
      status:       BookingStatus
      item: {
        id:         string
        title:      string
        images:     [{ url: string }]
      }
    }
    otherParticipant: {
      id:           string
      name:         string
      avatarUrl:    string | null
      isOnline?:    boolean   // H2 — presence via Supabase Realtime
    }
    lastMessage?: {
      content:      string    // truncado em 100 chars para preview
      senderId:     string
      createdAt:    string
    }
  }[]
}
```

---

## GET /api/conversations/:id

**Detalhe da conversa com histórico de mensagens.** Apenas participantes.

### Query params

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | number | 1 | Paginação de mensagens |
| `limit` | number | 50 (máx 100) | Mensagens por página |
| `before` | string | — | Cursor ISO 8601: mensagens antes desta data |

### Response `200`

```typescript
{
  data: {
    id:             string
    createdAt:      string
    booking?: {
      id:           string
      status:       BookingStatus
      startDate:    string
      endDate:      string
      totalPrice:   number
      item: {
        id:         string
        title:      string
        images:     [{ url: string }]
        owner: { id, name, avatarUrl }
      }
    }
    participants: {
      userId:       string
      name:         string
      avatarUrl:    string | null
      lastReadAt:   string | null
    }[]
    messages: {
      id:           string
      senderId:     string
      content:      string
      readAt:       string | null
      createdAt:    string
    }[]
    meta: { total, page, limit, hasMore }
  }
}
```

### Efeito colateral

Ao buscar a conversa, atualiza `lastReadAt` do participante autenticado para `now()`.

### Erros

| Código | Status |
|---|---|
| `CONVERSATION_NOT_FOUND` | 404 |
| `FORBIDDEN` | 403 |

---

## POST /api/conversations/:id/messages

**Envia uma mensagem.** Apenas participantes.

**Rate limit**: 60 req/min por usuário (anti-spam)

### Request body

```typescript
{
  content: string  // min 1, max 2000 chars (sem tags HTML — sanitizado no backend)
}
```

### Validação Zod

```typescript
const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})
```

### Regras de negócio

- Conteúdo é salvo como texto plano (sanitizado com `stripHtml` antes de persistir)
- Após inserir, atualiza `conversation.lastMessageAt`
- Cria notificação `NEW_MESSAGE` para o(s) outro(s) participante(s)
- O Supabase Realtime entrega a mensagem via canal `messages:conversation_id=eq.{id}` — o cliente não precisa fazer polling

### Response `201`

```typescript
{
  data: {
    id:             string
    conversationId: string
    senderId:       string
    content:        string
    readAt:         null
    createdAt:      string
  }
}
```

### Erros

| Código | Status |
|---|---|
| `CONVERSATION_NOT_FOUND` | 404 |
| `FORBIDDEN` | 403 |
| `CONTENT_REQUIRED` | 400 |

---

## PATCH /api/conversations/:id/read

**Marca todas as mensagens não lidas como lidas.** Apenas participantes.

Atualiza `readAt = now()` em todas as mensagens onde `senderId != userId` e `readAt IS NULL`.

### Response `200`

```typescript
{ data: { markedRead: number } }  // quantidade de mensagens atualizadas
```

---

## Integração Supabase Realtime (client-side)

Exemplo de subscription no React (ver ADR-003 para código completo):

```typescript
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on("postgres_changes", {
    event:  "INSERT",
    schema: "public",
    table:  "messages",
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // Adiciona mensagem ao estado local
    setMessages(prev => [...prev, payload.new as Message])
    // Se a mensagem é do outro usuário, marca como lida via API
    if (payload.new.sender_id !== currentUserId) {
      fetch(`/api/conversations/${conversationId}/read`, { method: "PATCH" })
    }
  })
  .subscribe()
```

**Pré-requisito**: a tabela `messages` deve ter RLS habilitado com a política `messages_select_participant` (ver `supabase/rls-policies.sql`). O JWT do NextAuth deve ser passado no header da conexão Supabase.
