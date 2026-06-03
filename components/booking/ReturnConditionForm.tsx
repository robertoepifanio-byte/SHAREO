"use client"

/**
 * P2-50 — Confirmação de estado pelo proprietário
 * Exibido em booking.status === "RETURNED" quando o usuário é o owner.
 * 3 opções radio: Perfeito estado | Desgaste normal | Com danos
 * Danos exige textarea descritiva + abre disputa via PATCH action: "open_dispute".
 */

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  bookingId: string
}

type Condition = "PERFECT" | "NORMAL_WEAR" | "DAMAGED"

interface ConditionOption {
  value:       Condition
  label:       string
  description: string
  color:       string
  icon:        string
}

const CONDITIONS: ConditionOption[] = [
  {
    value:       "PERFECT",
    label:       "Perfeito estado",
    description: "O item foi devolvido exatamente como entregue.",
    color:       "has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5",
    icon:        "✅",
  },
  {
    value:       "NORMAL_WEAR",
    label:       "Desgaste normal",
    description: "Pequenas marcas de uso esperadas para o período de locação.",
    color:       "has-[:checked]:border-blue-400/50 has-[:checked]:bg-blue-50",
    icon:        "👍",
  },
  {
    value:       "DAMAGED",
    label:       "Com danos",
    description: "Item devolvido com danos além do desgaste normal.",
    color:       "has-[:checked]:border-destructive/50 has-[:checked]:bg-destructive/10",
    icon:        "⚠️",
  },
]

export function ReturnConditionForm({ bookingId }: Props) {
  const router = useRouter()

  const [condition, setCondition] = useState<Condition | null>(null)
  const [damageDescription, setDamageDescription] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const isDamaged      = condition === "DAMAGED"
  const canConfirm     = condition !== null && (!isDamaged || damageDescription.trim().length >= 10)
  const charCount      = damageDescription.length
  const MIN_DAMAGE_LEN = 10

  async function handleConfirm() {
    if (!condition) return
    setError(null)
    setLoading(true)

    try {
      if (isDamaged) {
        // Danos: abre disputa com motivo
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            action: "open_dispute",
            reason: damageDescription.trim(),
          }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json?.error?.message ?? "Erro ao abrir disputa.")
        }
      } else {
        // Perfeito ou desgaste normal: confirma devolução → COMPLETED
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: "confirm_return" }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json?.error?.message ?? "Erro ao confirmar devolução.")
        }
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-xl border border-border bg-surface p-5"
      aria-labelledby="return-condition-heading"
    >
      <h2
        id="return-condition-heading"
        className="mb-1 font-semibold text-foreground"
      >
        Estado na devolução
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Como o item foi devolvido? Sua avaliação é importante para manter a confiança da plataforma.
      </p>

      {/* Opções de condição */}
      <fieldset className="mb-5 space-y-3" aria-required="true">
        <legend className="sr-only">Selecione o estado do item devolvido</legend>
        {CONDITIONS.map((opt) => {
          const inputId = `condition-${opt.value}`
          const isSelected = condition === opt.value
          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              aria-label={opt.label}
              className={[
                "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/40",
                opt.color,
              ].join(" ")}
            >
              <input
                id={inputId}
                type="radio"
                name="return-condition"
                value={opt.value}
                checked={isSelected}
                onChange={() => setCondition(opt.value)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                aria-describedby={`condition-desc-${opt.value}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <span aria-hidden="true" className="mr-1.5">{opt.icon}</span>
                  {opt.label}
                </p>
                <p
                  id={`condition-desc-${opt.value}`}
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  {opt.description}
                </p>
              </div>
            </label>
          )
        })}
      </fieldset>

      {/* Descrição dos danos — visível apenas quando DAMAGED selecionado */}
      {isDamaged && (
        <div
          className="mb-5"
          role="group"
          aria-labelledby="damage-desc-label"
        >
          <label
            id="damage-desc-label"
            htmlFor="damage-description"
            className="mb-1.5 block text-sm font-semibold text-foreground"
          >
            Descreva os danos
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Mínimo {MIN_DAMAGE_LEN} caracteres. Esta descrição será incluída na abertura da disputa.
          </p>
          <textarea
            id="damage-description"
            value={damageDescription}
            onChange={(e) => setDamageDescription(e.target.value)}
            placeholder="Ex: Tela arranhada na parte superior, caixa com amassado lateral…"
            rows={4}
            required
            minLength={MIN_DAMAGE_LEN}
            aria-required="true"
            aria-describedby="damage-char-count"
            className={[
              "w-full rounded-md border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
              "resize-none transition-colors",
              damageDescription.length > 0 && damageDescription.length < MIN_DAMAGE_LEN
                ? "border-destructive"
                : "border-input",
            ].join(" ")}
          />
          <p
            id="damage-char-count"
            className={[
              "mt-1 text-right text-xs",
              charCount < MIN_DAMAGE_LEN ? "text-destructive" : "text-muted-foreground",
            ].join(" ")}
          >
            {charCount} caractere{charCount !== 1 ? "s" : ""}
            {charCount < MIN_DAMAGE_LEN && ` (mínimo ${MIN_DAMAGE_LEN})`}
          </p>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0 text-destructive" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs text-destructive">
              Ao confirmar, uma disputa será aberta automaticamente e o time ShareO entrará em contato.
            </p>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Botão de confirmação */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!canConfirm || loading}
        aria-disabled={!canConfirm || loading}
        className={[
          "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold uppercase tracking-wide transition-colors",
          canConfirm && !loading
            ? isDamaged
              ? "bg-destructive text-white hover:bg-destructive-hover focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              : "bg-brand text-white hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            : "cursor-not-allowed bg-disabled-bg text-disabled-text",
        ].join(" ")}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        {loading
          ? "Confirmando…"
          : isDamaged
            ? "Abrir disputa"
            : "Confirmar estado"}
      </button>
    </section>
  )
}
