"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import type { BookingStatus } from "@prisma/client"
import { toDatetimeLocalValue, toDateInputValue, addDaysToDateInput } from "@/utils/date-input"

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

/**
 * Payload do horário real de retirada/devolução.
 *
 * Só envia `actualTime` quando o usuário REALMENTE editou o campo. Se deixou o
 * valor pré-preenchido, o servidor usa o próprio relógio — que é o que o rótulo
 * "Se não alterar, usa o horário atual" promete, e o que evita a rejeição por
 * diferença de relógio: o valor era julgado contra o relógio do SERVIDOR, então
 * um cliente adiantado alguns segundos era recusado por "não pode ser no futuro"
 * num horário que ninguém digitou.
 */
function horarioEditado(valor: string, semente: string): { actualTime?: string } {
  if (!valor || valor === semente) return {}
  return { actualTime: new Date(valor).toISOString() }
}

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

  // Horário real de retirada / devolução. O `*SeedRef` guarda o valor com que o
  // campo foi pré-preenchido, para distinguir "o usuário editou" de "deixou como
  // veio" — ver submitPickupTime().
  const [pickupTime,  setPickupTime]  = useState("")
  const pickupSeedRef = useRef("")
  const [pickupTokenInput, setPickupTokenInput] = useState("")
  const [returnTime,  setReturnTime]  = useState("")
  const returnSeedRef = useRef("")

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
      if (!res.ok) {
        const msg = json.error?.message ?? "Erro ao executar ação."
        setError(msg)
        toast.error(msg)
        return false
      }
      startTransition(() => router.refresh())
      return true
    } catch {
      const msg = "Erro de conexão. Tente novamente."
      setError(msg)
      toast.error(msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  const ACTION_SUCCESS_MESSAGES: Partial<Record<CoreAction, string>> = {
    confirm:        "Reserva confirmada",
    cancel:         "Reserva cancelada",
    mark_active:    "Retirada confirmada",
    mark_returned:  "Devolução iniciada — aguardando o locador confirmar",
    confirm_return: "Recebimento confirmado",
    open_dispute:   "Problema reportado",
  }

  async function execCore(action: CoreAction, extra?: object) {
    const ok = await callApi(`/api/bookings/${bookingId}`, { action, ...extra })
    if (ok) {
      const msg = ACTION_SUCCESS_MESSAGES[action]
      if (msg) toast.success(msg)
      reset()
    }
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
      if (!res.ok) {
        const msg = json.error?.message ?? "Erro ao solicitar extensão."
        setError(msg)
        toast.error(msg)
        return
      }
      toast.success("Solicitação de extensão enviada")
      startTransition(() => router.refresh())
      reset()
    } catch {
      const msg = "Erro de conexão. Tente novamente."
      setError(msg)
      toast.error(msg)
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
      if (!res.ok) {
        const msg = json.error?.message ?? "Erro ao responder extensão."
        setError(msg)
        toast.error(msg)
        return
      }
      toast.success(action === "approve" ? "Extensão aprovada" : "Extensão recusada")
      startTransition(() => router.refresh())
      reset()
    } catch {
      const msg = "Erro de conexão. Tente novamente."
      setError(msg)
      toast.error(msg)
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
    if (pickupTokenInput.replace(/\s/g, "").length !== 6) {
      setError("Informe o código de 6 dígitos apresentado pelo locatário.")
      return
    }
    await execCore("mark_active", {
      ...horarioEditado(pickupTime, pickupSeedRef.current),
      pickupToken: pickupTokenInput.replace(/\s/g, ""),
    })
  }

  async function submitReturnTime() {
    await execCore("mark_returned", horarioEditado(returnTime, returnSeedRef.current))
  }

  // ─── Botões principais ────────────────────────────────────────────────────

  const buttons: { emoji?: string; label: string; variant: "primary" | "danger" | "ghost"; onClick: () => void }[] = []

  if (isOwner) {
    if (status === "PENDING")
      buttons.push({ emoji: "✅", label: "Confirmar reserva",    variant: "primary", onClick: () => execCore("confirm") })
    if (status === "CONFIRMED")
      buttons.push({ emoji: "▶️", label: "Marcar como ativo",    variant: "primary", onClick: () => { const v = toDatetimeLocalValue(); pickupSeedRef.current = v; setPickupTime(v); setPanel("pickup_time") } })
    if (status === "RETURNED" && !hideReturnActions)
      buttons.push({ emoji: "📦", label: "Confirmar recebimento", variant: "primary", onClick: () => execCore("confirm_return") })
  }
  if (isBorrower) {
    if (status === "ACTIVE" && !hideReturnActions)
      buttons.push({ emoji: "📦", label: "Devolver",   variant: "primary", onClick: () => { const v = toDatetimeLocalValue(); returnSeedRef.current = v; setReturnTime(v); setPanel("return_time") } })
    if (status === "ACTIVE")
      buttons.push({ emoji: "📅", label: "Solicitar extensão de prazo", variant: "ghost", onClick: () => setPanel("extend_request") })
  }
  if (status === "PENDING" || status === "CONFIRMED")
    buttons.push({ label: "Cancelar reserva", variant: "danger", onClick: () => setPanel("cancel") })
  if (status === "ACTIVE" || status === "RETURNED")
    buttons.push({ emoji: "⚠️", label: "Reportar problema", variant: "ghost", onClick: () => setPanel("report") })

  // Extensão pendente — proprietário responde
  const showExtendRespond = isOwner && extensionStatus === "PENDING"

  if (buttons.length === 0 && !conversationId && !showExtendRespond) return null

  // ─── Data mínima para extensão = amanhã ──────────────────────────────────
  const minExtDateStr = addDaysToDateInput(toDateInputValue(), 1)

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
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
            <button type="button" onClick={submitCancel} disabled={!reason.trim() || loading}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              Confirmar cancelamento
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Confirmar retirada — valida token + horário ── */}
      {panel === "pickup_time" && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Confirmar retirada do item</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Solicite o código de retirada ao locatário e informe abaixo para confirmar a entrega.
          </p>

          <label htmlFor="pickup-token-input" className="mb-1 block text-xs font-semibold text-foreground">
            Código do locatário <span className="text-destructive">*</span>
          </label>
          <input
            id="pickup-token-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={pickupTokenInput}
            onChange={(e) => setPickupTokenInput(e.target.value.replace(/\D/g, ""))}
            className="mb-3 w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-center text-2xl font-bold tracking-[0.3em] text-primary outline-none focus:border-brand"
          />

          <label htmlFor="pickup-time-input" className="mb-1 block text-xs font-semibold text-foreground">
            Horário da retirada <span className="text-destructive">*</span>
          </label>
          <input
            id="pickup-time-input"
            type="datetime-local"
            value={pickupTime}
            max={toDatetimeLocalValue()}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          <p className="mt-1 mb-3 text-[10px] text-muted-foreground">
            Não pode ser no futuro. Se não alterar, usa o horário atual.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitPickupTime}
              disabled={loading || pickupTokenInput.length !== 6}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Confirmar retirada
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Confirmar devolução com horário ── */}
      {panel === "return_time" && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Devolver o item</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Informe o horário exato da devolução. A locação ficará como <strong>Devolução em andamento</strong> até o locador confirmar o recebimento.
          </p>
          <label htmlFor="return-time-input" className="mb-1 block text-xs font-medium text-foreground">
            Horário da devolução <span className="text-destructive">*</span>
          </label>
          <input
            id="return-time-input"
            type="datetime-local"
            value={returnTime}
            max={toDatetimeLocalValue()}
            onChange={(e) => setReturnTime(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Não pode ser no futuro. Se não alterar, usa o horário atual.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submitReturnTime}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Devolver
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
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
            <button type="button" onClick={submitExtendRequest} disabled={!newEndDate || loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              Solicitar extensão
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel: Proprietário responde extensão pendente ── */}
      {showExtendRespond && extensionRequestedEndDate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:bg-amber-900/30 dark:border-amber-700">
          <p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-200">Solicitação de extensão de prazo</p>
          <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
            O locatário solicita estender a devolução até{" "}
            <strong>{fmtDate(extensionRequestedEndDate)}</strong>.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => submitExtendRespond("approve")} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 min-h-11 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              <span aria-hidden="true">✅</span> Aprovar extensão
            </button>
            <button type="button" onClick={() => submitExtendRespond("reject")} disabled={loading}
              className="rounded-lg border border-red-300 px-4 py-2 min-h-11 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
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
                type="button"
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
            type="button"
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
              type="button"
              onClick={submitReport}
              disabled={!reportCategory || !reportDesc.trim() || loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Enviar relatório
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background transition-colors">
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 min-h-11 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <span aria-hidden="true">💬</span>
            Abrir chat
          </Link>
        )}
        {buttons.map(({ emoji, label, variant, onClick }) => (
          <button
            type="button"
            key={label}
            onClick={onClick}
            disabled={loading}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 min-h-11 text-sm font-semibold transition-all disabled:opacity-50",
              variant === "primary" ? "bg-brand text-white hover:opacity-90" :
              variant === "danger"  ? "border border-red-300 text-red-600 hover:bg-red-50" :
                                     "border border-border text-foreground hover:bg-background",
            ].join(" ")}
          >
            {emoji && <span aria-hidden="true">{emoji}</span>}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
