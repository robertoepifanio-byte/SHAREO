"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface Message {
  id:        string
  senderId:  string
  content:   string
  readAt:    string | null
  createdAt: string
}

// Payload que o Supabase Realtime envia (colunas em snake_case)
interface RealtimeMessageRow {
  id:              string
  conversation_id: string
  sender_id:       string
  content:         string
  read_at:         string | null
  created_at:      string
  deleted_at:      string | null
}

interface Props {
  conversationId:  string
  currentUserId:   string
  initialMessages: Message[]
  otherName:       string
}

function fmtTime(d: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(d))
}

function fmtDay(d: string) {
  const date  = new Date(d)
  const today = new Date()
  const yest  = new Date(); yest.setDate(yest.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Hoje"
  if (date.toDateString() === yest.toDateString())  return "Ontem"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(date)
}

export function ChatWindow({ conversationId, currentUserId, initialMessages, otherName }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input,    setInput]    = useState("")
  const [error,    setError]    = useState("")
  const [isLive,   setIsLive]   = useState(false)   // true quando Realtime está ativo
  const [pending,  startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Scroll para o final quando chegarem mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Realtime ou polling — escolhe automaticamente conforme configuração
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    if (supabase) {
      // ── Supabase Realtime ──────────────────────────────────────────────
      // Pré-requisito: habilitar a tabela `messages` na publicação
      // supabase_realtime no Supabase Dashboard → Database → Replication.
      //
      // Nota de segurança: o filtro é aplicado server-side pelo Supabase,
      // mas sem RLS qualquer cliente pode subscrever qualquer conversa.
      // Para produção: habilitar RLS na tabela messages com política de participante.
      const channel = supabase
        .channel(`conv:${conversationId}`)
        .on<RealtimeMessageRow>(
          "postgres_changes",
          {
            event:  "INSERT",
            schema: "public",
            table:  "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new
            // Ignora soft-deleted
            if (row.deleted_at) return

            const msg: Message = {
              id:        row.id,
              senderId:  row.sender_id,
              content:   row.content,
              readAt:    row.read_at,
              createdAt: row.created_at,
            }

            setMessages((prev) => {
              // Já temos esta mensagem (ex.: confirmação da API chegou antes do evento)
              if (prev.some((m) => m.id === msg.id)) return prev
              // Substitui mensagem otimista com mesmo conteúdo (race: Realtime chegou antes da API)
              const withoutOptimistic = prev.filter(
                (m) => !(
                  m.id.startsWith("optimistic-") &&
                  m.senderId === msg.senderId &&
                  m.content  === msg.content
                )
              )
              return [...withoutOptimistic, msg]
            })

            // Marca como lido se a mensagem é do outro participante
            if (row.sender_id !== currentUserId) {
              fetch(`/api/conversations/${conversationId}`).catch(() => {})
            }
          }
        )
        .subscribe((status) => {
          setIsLive(status === "SUBSCRIBED")
        })

      return () => {
        supabase.removeChannel(channel)
        setIsLive(false)
      }
    }

    // ── Fallback: polling a cada 3s ────────────────────────────────────
    // Usado quando NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
    // não estão configuradas.
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/conversations/${conversationId}`)
        const json = await res.json()
        if (!res.ok || !json.data?.messages) return
        const serverMessages = json.data.messages as Message[]
        setMessages((prev) => {
          const serverIds        = new Set(serverMessages.map((m) => m.id))
          const pendingOptimistics = prev.filter(
            (m) => m.id.startsWith("optimistic-") && !serverIds.has(m.id),
          )
          return [...serverMessages, ...pendingOptimistics]
        })
      } catch { /* ignora falhas de rede transitórias */ }
    }, 3000)

    return () => clearInterval(interval)
  }, [conversationId, currentUserId])

  async function send() {
    const content = input.trim()
    if (!content) return
    setError("")
    setInput("")

    const optimistic: Message = {
      id:        `optimistic-${Date.now()}`,
      senderId:  currentUserId,
      content,
      readAt:    null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    startTransition(async () => {
      try {
        const res  = await fetch(`/api/conversations/${conversationId}/messages`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error?.message ?? "Erro ao enviar mensagem.")
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
          return
        }
        // Substitui otimista pelo real (se o Realtime não o substituiu antes)
        setMessages((prev) =>
          prev.map((m) => m.id === optimistic.id ? json.data : m)
        )
      } catch {
        setError("Falha de conexão. Tente novamente.")
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      }
    })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  let lastDay = ""

  return (
    <div className="flex flex-1 flex-col">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-1">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Diga olá para {otherName}!
            </p>
          )}

          {messages.map((msg) => {
            const isMe    = msg.senderId === currentUserId
            const day     = fmtDay(msg.createdAt)
            const showDay = day !== lastDay
            lastDay = day

            return (
              <div key={msg.id}>
                {showDay && (
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{day}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? "rounded-br-sm bg-brand text-white"
                        : "rounded-bl-sm bg-surface border border-border text-foreground"
                    } ${msg.id.startsWith("optimistic-") ? "opacity-70" : ""}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                      {msg.id.startsWith("optimistic-") ? "enviando…" : fmtTime(msg.createdAt)}
                      {isMe && !msg.id.startsWith("optimistic-") && msg.readAt && " ✓✓"}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-surface px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {error && (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={2000}
              placeholder="Escreva uma mensagem…"
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || pending}
              aria-label="Enviar mensagem"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className={`flex items-center gap-1 text-[10px] ${isLive ? "text-success" : "text-muted-foreground"}`}>
              {isLive && <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />}
              {isLive ? "ao vivo" : ""}
            </span>
            <p className="text-[10px] text-muted-foreground">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
