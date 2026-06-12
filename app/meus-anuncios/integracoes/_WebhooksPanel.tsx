"use client"

import { useState } from "react"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { WEBHOOK_EVENTS } from "@/lib/outboundWebhooks"
import type { WebhookEvent } from "@/lib/outboundWebhooks"

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "booking.created":   "Reserva solicitada",
  "booking.confirmed": "Reserva confirmada pelo locador",
  "booking.cancelled": "Reserva cancelada",
  "booking.paid":      "Pagamento recebido",
  "booking.active":    "Item entregue (aluguel ativo)",
  "booking.returned":  "Item devolvido",
  "booking.completed": "Aluguel concluído",
}

type Webhook = {
  id:             string
  url:            string
  events:         string[]
  isActive:       boolean
  failureCount:   number
  lastFiredAt:    string | null
  lastStatusCode: number | null
  createdAt:      string
}

interface Props {
  initialWebhooks: Webhook[]
}

export function WebhooksPanel({ initialWebhooks }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks)
  const [creating, setCreating]  = useState(false)
  const [newUrl,   setNewUrl]    = useState("")
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>([])
  const [creating_,  setCreating_]  = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newSecret,  setNewSecret]  = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function toggleEvent(ev: WebhookEvent) {
    setNewEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating_(true)
    setCreateError(null)
    setNewSecret(null)

    try {
      const res  = await fetch("/api/pj/webhooks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: newUrl, events: newEvents }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCreateError(json?.error?.message ?? "Erro ao criar webhook.")
        return
      }
      setWebhooks((prev) => [json.data, ...prev])
      setNewSecret(json.data.secret)
      setNewUrl("")
      setNewEvents([])
      setCreating(false)
    } catch {
      setCreateError("Erro de conexão.")
    } finally {
      setCreating_(false)
    }
  }

  async function handleToggle(wh: Webhook) {
    setTogglingId(wh.id)
    try {
      const res  = await fetch(`/api/pj/webhooks/${wh.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !wh.isActive }),
      })
      if (res.ok) {
        setWebhooks((prev) =>
          prev.map((w) => w.id === wh.id ? { ...w, isActive: !w.isActive, failureCount: 0 } : w),
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este webhook?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/pj/webhooks/${id}`, { method: "DELETE" })
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Webhooks de saída</h2>
          <p className="text-sm text-muted-foreground">
            Receba notificações HTTP quando eventos de reserva acontecerem.
          </p>
        </div>
        {!creating && webhooks.length < 5 && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo endpoint
          </button>
        )}
      </div>

      {/* Secret do webhook recém-criado */}
      {newSecret && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="mb-2 text-sm font-semibold text-success">Webhook criado com sucesso!</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Guarde o secret abaixo — ele <strong>não será exibido novamente</strong>.
            Use-o para validar a assinatura <code className="rounded bg-muted px-1">X-ShareO-Signature</code>.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-background px-3 py-2 font-mono text-xs text-foreground break-all">
              {newSecret}
            </code>
            <button
              onClick={() => { void copyToClipboard(newSecret) }}
              className="flex-shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs hover:bg-background transition-colors"
              aria-label="Copiar secret"
            >
              Copiar
            </button>
          </div>
          <button
            onClick={() => setNewSecret(null)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Fechar ×
          </button>
        </div>
      )}

      {/* Formulário de criação */}
      {creating && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Novo endpoint</h3>

          <div>
            <label htmlFor="wh-url" className="mb-1 block text-sm font-medium text-foreground">
              URL do endpoint (HTTPS obrigatório)
            </label>
            <input
              id="wh-url"
              type="url"
              required
              placeholder="https://meu-erp.com/shareo/events"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Eventos</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="h-4 w-4 rounded border-input accent-brand"
                  />
                  <span className="text-sm text-foreground">{EVENT_LABELS[ev]}</span>
                </label>
              ))}
            </div>
          </div>

          {createError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{createError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating_ || newEvents.length === 0}
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {creating_ ? "Criando…" : "Criar webhook"}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setCreateError(null); setNewUrl(""); setNewEvents([]) }}
              className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm text-foreground hover:bg-background transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de webhooks */}
      {webhooks.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-muted-foreground" aria-hidden="true">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          <p className="text-sm font-medium text-muted-foreground">Nenhum webhook configurado</p>
          <p className="mt-1 text-xs text-muted-foreground">Crie um endpoint para integrar com seu ERP.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${wh.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                    <code className="text-sm font-mono text-foreground truncate">{wh.url}</code>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {wh.events.map((ev) => (
                      <span key={ev} className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                        {ev}
                      </span>
                    ))}
                  </div>
                  {wh.lastFiredAt && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Último envio:{" "}
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(wh.lastFiredAt))}
                      {wh.lastStatusCode && (
                        <span className={`ml-1.5 font-semibold ${wh.lastStatusCode < 300 ? "text-success" : "text-destructive"}`}>
                          {wh.lastStatusCode}
                        </span>
                      )}
                    </p>
                  )}
                  {wh.failureCount > 0 && (
                    <p className="mt-0.5 text-xs text-destructive">{wh.failureCount} falhas consecutivas</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(wh)}
                    disabled={togglingId === wh.id}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {wh.isActive ? "Pausar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    disabled={deletingId === wh.id}
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    aria-label="Remover webhook"
                  >
                    {deletingId === wh.id ? "…" : "Remover"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentação rápida */}
      <div className="rounded-xl border border-border bg-surface p-5 text-sm">
        <h3 className="mb-3 font-semibold text-foreground">Como validar a assinatura</h3>
        <p className="mb-2 text-muted-foreground">
          Cada requisição inclui o header <code className="rounded bg-muted px-1 text-xs">X-ShareO-Signature: sha256=&#123;hmac&#125;</code>.
          Valide com HMAC-SHA256 do body usando seu secret:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs text-foreground">
{`// Node.js
const crypto = require('crypto')
const sig = crypto
  .createHmac('sha256', process.env.SHAREO_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex')
const isValid = \`sha256=\${sig}\` === req.headers['x-shareo-signature']`}
        </pre>
      </div>
    </div>
  )
}
