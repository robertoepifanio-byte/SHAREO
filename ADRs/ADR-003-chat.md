# ADR-003 — Estratégia de Chat em Tempo Real

**Status**: Aceito  
**Data**: 2026-05-22  
**Decisores**: Arquiteto  
**Revisores**: Full Stack Dev, DevOps  
**Referência**: Analise_Custo_Chat_Shareo.docx  

---

## Contexto

O ShareO precisa de um sistema de mensagens em tempo real entre locador e locatário, vinculado a uma negociação/booking específico. Requisitos do MVP:

- Entrega de mensagens em tempo real (< 1 segundo de latência)
- Persistência de histórico (usuário vê mensagens anteriores ao abrir o chat)
- Indicador de leitura (read receipts)
- Máximo de ~100 conversas simultâneas ativas no MVP
- Sem necessidade de grupos, threads, ou anexos (apenas texto)

Opções avaliadas: Supabase Realtime, Ably, Pusher, Socket.io (self-hosted).

---

## Decisão

**Supabase Realtime** com Postgres Changes (broadcast de INSERT em `messages`).

---

## Justificativa

### Comparativo

| Critério | Supabase Realtime | Ably | Pusher | Socket.io |
|---|---|---|---|---|
| Custo no MVP | Incluído no Supabase free | US$29/mês (Reactor) | US$49/mês | Infra própria (US$5–20/mês) |
| Persistência automática | Sim (tabela messages no PG) | Não (separar) | Não (separar) | Não (separar) |
| Infra adicional | Nenhuma | Não | Não | Sim (servidor WS) |
| Latência | ~50–150ms | ~60ms | ~60ms | ~20ms (local) |
| Escala para MVP | Sim (200 conexões simultâneas free) | Sim | Sim | Sim |
| RLS integrado | Sim (via Supabase RLS) | Não | Não | Não |

### Por Supabase Realtime

O principal diferencial é **zero infraestrutura adicional**: a persistência de mensagens já existe na tabela `messages` do PostgreSQL. O Supabase Realtime escuta INSERTs nessa tabela e faz broadcast via WebSocket para os participantes da conversa.

A integração com Row Level Security (RLS) é nativa: uma política de `SELECT` na tabela `messages` garante que apenas participantes da conversa recebam as mensagens, sem lógica adicional no servidor.

Para o volume do MVP (estimativa: < 500 usuários ativos, < 100 conversas simultâneas), o free tier do Supabase (200 concurrent realtime connections) é suficiente.

### Contra Ably/Pusher

Serviços externos exigiriam: (a) armazenar mensagens separadamente no próprio banco de qualquer forma para persistência; (b) pagar um serviço adicional; (c) gerenciar dois sistemas para um único feature. Faz sentido na H3 se o volume exigir > 1.000 conexões simultâneas.

---

## Implementação

### RLS para mensagens

```sql
-- Política: usuário só vê mensagens de conversas em que participa
CREATE POLICY "participants_can_read_messages"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Política: usuário só insere mensagem em conversa em que participa
CREATE POLICY "participants_can_insert_messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);
```

### Subscribe no cliente

```typescript
// hooks/useChat.ts
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Carrega histórico
    supabase
      .from("messages")
      .select("*, sender:users(id, name, avatarUrl)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data ?? []))

    // Subscribe a novos INSERTs
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  return { messages }
}
```

---

## Consequências

**Positivas**:
- Zero custo adicional no MVP
- Persistência automática sem código extra
- RLS nativo garante segurança das mensagens
- Uma única fonte de verdade (PostgreSQL) para histórico e tempo real

**Negativas**:
- Latência ligeiramente maior que Ably/Pusher (~100ms vs. ~60ms) — aceitável para chat de negociação
- Limite de 200 conexões simultâneas no free tier — planejar upgrade quando DAU ultrapassar ~500 usuários ativos/dia

---

## Itens em Aberto

- [ ] Definir política RLS de INSERT na tabela `messages` (ver template acima)
- [ ] Implementar indicador de "digitando..." (typing indicator via Broadcast channel, não via Postgres)
- [ ] Definir limite de tamanho de mensagem (sugestão: 2.000 caracteres)
- [ ] Notificação push para mensagens recebidas quando app está em background (H2 — via Supabase Edge Functions + FCM)
