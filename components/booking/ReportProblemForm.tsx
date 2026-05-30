"use client"

/**
 * P1-26 — Formulário Reportar Problema
 * Permite ao locatário ou locador abrir uma disputa em uma reserva ACTIVE ou RETURNED.
 *
 * Campos:
 *   - Radio: motivo pré-definido
 *   - Textarea: descrição obrigatória (max 500 chars)
 *   - Input file: foto opcional com preview
 */

import { useState, useRef, useCallback, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"

const PROBLEM_REASONS = [
  { value: "NAO_FUNCIONA",       label: "Não funciona" },
  { value: "VEIO_DANIFICADO",    label: "Veio danificado" },
  { value: "FALTAM_ACESSORIOS",  label: "Faltam acessórios" },
  { value: "OUTRO",              label: "Outro" },
] as const

type ProblemReason = typeof PROBLEM_REASONS[number]["value"]

interface Props {
  bookingId: string
  /** Callback opcional chamado após envio bem-sucedido */
  onSuccess?: () => void
}

export function ReportProblemForm({ bookingId, onSuccess }: Props) {
  const router = useRouter()

  const [reason, setReason]           = useState<ProblemReason>("NAO_FUNCIONA")
  const [description, setDescription] = useState("")
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [photoFile, setPhotoFile]     = useState<File | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!description.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      // Se houver foto, faz upload primeiro (usando Supabase Storage via API interna)
      let photoUrl: string | undefined
      if (photoFile) {
        const formData = new FormData()
        formData.append("file", photoFile)
        formData.append("bookingId", bookingId)
        const uploadRes = await fetch(`/api/bookings/${bookingId}/photos`, {
          method: "POST",
          body:   formData,
        })
        if (uploadRes.ok) {
          const uploadJson = (await uploadRes.json()) as { data?: { url: string } }
          photoUrl = uploadJson.data?.url
        }
        // Falha no upload de foto não bloqueia o envio do dispute
      }

      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          reason:      reason,
          description: description.trim(),
          ...(photoUrl && { photoUrl }),
        }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        throw new Error(json.error?.message ?? "Erro ao enviar relatório.")
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }, [bookingId, description, photoFile, reason, onSuccess, router])

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-4 text-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-success" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div>
          <p className="font-semibold text-success">Problema reportado com sucesso!</p>
          <p className="text-xs text-success/80">Nossa equipe analisará a ocorrência em até 24h.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-5" noValidate>

      {/* Motivo */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Qual é o problema?
        </legend>
        <div className="space-y-2.5">
          {PROBLEM_REASONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <input
                type="radio"
                name="problem-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="h-4 w-4 accent-brand"
                aria-label={label}
              />
              <span className="font-medium text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Descrição */}
      <div>
        <label htmlFor={`dispute-desc-${bookingId}`} className="mb-1.5 block text-sm font-semibold text-foreground">
          Descreva o problema <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <textarea
          id={`dispute-desc-${bookingId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          required
          rows={4}
          placeholder="Descreva em detalhes o que aconteceu..."
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          aria-describedby={`dispute-desc-count-${bookingId}`}
        />
        <p
          id={`dispute-desc-count-${bookingId}`}
          className="mt-1 text-right text-xs text-muted-foreground"
          aria-live="polite"
        >
          {description.length}/500
        </p>
      </div>

      {/* Foto opcional */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">
          Foto (opcional)
        </p>

        {previewUrl && (
          <div className="mb-3 relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview da foto do problema"
              className="h-32 w-auto rounded-lg border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null)
                setPhotoFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white hover:opacity-90"
              aria-label="Remover foto"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        <label
          htmlFor={`dispute-photo-${bookingId}`}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-brand hover:text-brand transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          {photoFile ? "Trocar foto" : "Adicionar foto"}
        </label>
        <input
          ref={fileInputRef}
          id={`dispute-photo-${bookingId}`}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="sr-only"
          aria-label="Selecionar foto do problema"
        />
      </div>

      {/* Erro */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !description.trim()}
        className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-destructive px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-busy={submitting}
      >
        {submitting ? "Enviando..." : "Reportar problema"}
      </button>
    </form>
  )
}
