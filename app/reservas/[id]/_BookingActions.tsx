"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { BookingStatus } from "@prisma/client"

interface Props {
  bookingId:                  string
  status:                     BookingStatus
  isOwner:                    boolean
  isBorrower:                 boolean
  conversationId?:            string
  extensionStatus:            string | null
  extensionRequestedEndDate:  string | null
  /** Suprimir botões de devolução quando ReturnChecklist/ReturnConditionForm já os exibe */
  hideReturnActions?:         boolean
}

type CoreAction = "confirm" | "cancel" | "mark_active" | "mark_returned" | "confirm_return" | "open_dispute"
type Panel = "cancel" | "dispute" | "extend_request" | "extend_respond" | "report" | "pickup_time" | "return_time"

const REPORT_CATEGORIES = [
  { value: "NOT_WORKING",  label: "Item não funciona" },
  { value: "DAMAGED",      label: "Veio danificado" },
  { value: "MISSING_PARTS",label: "Faltam acessórios" },
  { value: "OTHER",        label: "Outro" },
]

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso))

export function BookingActions({
  bookingId, status, isOwner, isBorrower,
  conversationId, extensionStatus, extensionRequestedEndDate,
  hideReturnActions,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [panel,    setPanel]    = useState<Panel | null>(null)

  // cancel / dispute
  const [reason, setReason] = useState("")

  // extend request
  const [newEndDate, setNewEndDate] = useState("")

  // horário real de retirada / devolução
  const nowLocal = () => {
    const d = new Date()
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
  }
  const [pickupTime,  setPickupTime]  = useState("")
  const [returnTime,  setReturnTime]  = useState("")

  // report problem
  const [reportCategory, setReportCategory] = useState("")
  const [reportDesc,     setReportDesc]     = useState("")
  const [reportPhoto,    setReportPhoto]    = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setPanel(null)
    setReason("")
    setNewEndDate("")
    setReportCategory("")
    setReportDesc("")
    setReportPhoto(null)
  }

  async function callApi(url: string, body: object) {
    setError("")
    setLoading(true)
    try {
      const res  = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao executar ação."); return false }
      startTransition(() => router.refresh())
      return true
    } finally {
      setLoading(false)
    }
  }

  async function execCore(action: CoreAction, extra?: object) {
    const ok = await callApi(`/api/bookings/${bookingId}`, { action, ...extra })
    if (ok) reset()
  }

  async function submitCancel() {
    await execCore("cancel", { reason })
  }

  async function submitExtendRequest() {
    setError("")
    setLoading(true)
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEndDate }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao solicitar extensão."); return }
      startTransition(() => router.refresh())
      reset()
    } finally {
      setLoading(false)
    }
  }

  async function submitExtendRespond(action: "approve" | "reject") {
    setError("")
    setLoading(true)
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? "Erro ao responder extensão."); return }
      startTransition(() => router.refresh())
      reset()
    } finally {
      setLoading(false)
    }
  }

  async function submitReport() {
    setError("")
    setLoading(true)
    try {
      let photoUrl: string | undefined
      if (reportPhoto) {
        const form = new FormData()
        form.append("file", reportPhoto)
        form.append("bookingId", bookingId)
        form.append("phase", "REPORT")
        const up = await fetch("/api/upload", { method: "POST", body: form })
        if (up.ok) {
          const upJson = await up.json()
          photoUrl = upJson.url
        }
      }
      const ok = await callApi(`/api/bookings/${bookingId}`, {
        action: "open_dispute",
        reason: `[${REPORT_CATEGORIES.find(c => c.value === reportCategory)?.label ?? reportCategory}] ${reportDesc}`,
        ...(photoUrl && { photoUrl }),
      })
      if (ok) reset()
    } finally {
      setLoading(false)
    }
  }

  async function submitPickupTime() {
    const actualTime = pickupTime
      ? new Date(pickupTime).toISOString()
      : new Date().toISOString()
    await execCore("mark_active", { actualTime })
  }

  async function submitReturnTime() {
    const actualTime = returnTime
      ? new Date(returnTime).toISOString()
      : new Date().toISOString()
    await execCore("mark_returned", { actualTime })
  }

  // ─── Botões principais ────────────────────────────────────────────────────

  const buttons: { label: string; variant: "primary" | "danger" | "ghost"; onClick: () => void }[] = []

  if (isOwner) {
    if (status === "PENDING")
      buttons.push({ label: "✅ Confirmar reserva",    variant: "primary", onClick: () => execCore("confirm") })
    if (status === "CONFIRMED")
      buttons.push({ label: "▶️ Marcar como ativo",    variant: "primary", onClick: () => { setPickupTime(nowLocal()); setPanel("pickup_time") } })
    if (status === "RETURNED" && !hideReturnActions)
      buttons.push({ label: "📦 Confirmar recebimento", variant: "primary", onClick: () => execCore("confirm_return") })
  }
  if (isBorrower) {
    if (status === "ACTIVE" && !hideReturnActions)
      buttons.push({ label: "📦 Confirmar devolução",   variant: "primary", onClick: () => { setReturnTime(nowLocal()); setPanel("return_time") } })
    if (status === "ACTIVE")
      buttons.push({ label: "📅 Solicitar extensão de prazo", variant: "ghost", onClick: () => setPanel("extend_request") })
  }
  if (status === "PENDING" || status === "CONFIRMED")
    buttons.push({ label: "Cancelar reserva", variant: "danger", onClick: () => setPanel("cancel") })
  if (status === "ACTIVE" || status === "RETURNED")
    buttons.push({ label: "⚠️ Reportar problema", variant: "ghost", onClick: () => setPanel("report") })

  // Extensão pendente — proprietário responde
  const showExtendRespond = isOwner && extensionStatus === "PENDING"

  if (buttons.length === 0 && !conversationId && !showExtendRespond) return null

  // ─── Data mínima para extensão = amanhã ──────────────────────────────────
  const minExtDate = new Date()
  minExtDate.setDate(minExtDate.getDate() + 1)
  const minExtDateStr = minExtDate.toISOString().split("T")[0]

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* ── Painel: Cancelar ── */}
      {panel === "cancel" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">
            Motivo do cancelamento <span className="text-destructive">*</span>
          </p>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            rows={3} maxLength={500} placeholder="Descreva o motivo..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand resize-none"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={submitCancel} disabled={!reason.trim() || loading}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              Confirmar cancelamento
            </button>
            <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Confirmar retirada com horário ── */}
      {panel === "pickup_time" && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Confirmar retirada do item</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Informe o horário exato da retirada. O prazo de devolução será calculado a partir deste momento.
          </p>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Horário da retirada <span className="text-destructive">*</span>
          </label>
          <input
            type="datetime-local"
            value={pickupTime}
            max={nowLocal()}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Não pode ser no futuro. Se não alterar, usa o horário atual.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={submitPickupTime}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Confirmar retirada
            </button>
            <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Confirmar devolução com horário ── */}
      {panel === "return_time" && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Confirmar devolução do item</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Informe o horário exato da devolução. Este registro fica vinculado à reserva.
          </p>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Horário da devolução <span className="text-destructive">*</span>
          </label>
          <input
            type="datetime-local"
            value={returnTime}
            max={nowLocal()}
            onChange={(e) => setReturnTime(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Não pode ser no futuro. Se não alterar, usa o horário atual.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={submitReturnTime}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Confirmar devolução
            </button>
            <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Solicitar extensão de prazo ── */}
      {panel === "extend_request" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Nova data de devolução</p>
          <p className="mb-3 text-xs text-muted-foreground">O proprietário precisará aprovar a extensão.</p>
          <input
            type="date" value={newEndDate} min={minExtDateStr}
            onChange={(e) => setNewEndDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={submitExtendRequest} disabled={!newEndDate || loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              Solicitar extensão
            </button>
            <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Proprietário responde extensão pendente ── */}
      {showExtendRespond && extensionRequestedEndDate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-900">Solicitação de extensão de prazo</p>
          <p className="mb-3 text-sm text-amber-800">
            O locatário solicita estender a devolução até{" "}
            <strong>{fmtDate(extensionRequestedEndDate)}</strong>.
          </p>
          <div className="flex gap-2">
            <button onClick={() => submitExtendRespond("approve")} disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              ✅ Aprovar extensão
            </button>
            <button onClick={() => submitExtendRespond("reject")} disabled={loading}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Reportar problema ── */}
      {panel === "report" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Reportar problema com o item</p>

          <p className="mb-1.5 text-xs font-medium text-foreground">Tipo de problema <span className="text-destructive">*</span></p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setReportCategory(cat.value)}
                className={[
                  "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                  reportCategory === cat.value
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-border text-foreground hover:bg-background",
                ].join(" ")}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <p className="mb-1.5 text-xs font-medium text-foreground">Descrição <span className="text-destructive">*</span></p>
          <textarea
            value={reportDesc} onChange={(e) => setReportDesc(e.target.value)}
            rows={3} maxLength={1000} placeholder="Descreva o problema com detalhes..."
            className="mb-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand resize-none"
          />

          <p className="mb-1.5 text-xs font-medium text-foreground">Foto do problema (opcional)</p>
          <input
            ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setReportPhoto(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-xs text-muted-foreground hover:border-brand hover:text-brand transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            {reportPhoto ? reportPhoto.name : "Adicionar foto"}
          </button>

          <div className="flex gap-2">
            <button
              onClick={submitReport}
              disabled={!reportCategory || !reportDesc.trim() || loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Enviar relatório
            </button>
            <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Botões principais ── */}
      <div className="flex flex-wrap gap-2">
        {conversationId && (
          <Link
            href={`/mensagens/${conversationId}`}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            💬 Abrir chat
          </Link>
        )}
        {buttons.map(({ label, variant, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={loading}
            className={[
              "rounded-lg px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50",
              variant === "primary" ? "bg-brand text-white hover:opacity-90" :
              variant === "danger"  ? "border border-red-300 text-red-600 hover:bg-red-50" :
                                     "border border-border text-foreground hover:bg-background",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
