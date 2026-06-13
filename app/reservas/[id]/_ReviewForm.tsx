"use client"

import { useRef, useState } from "react"
import { trackEvent } from "@/components/analytics/GoogleAnalytics"

type ReviewType = "ITEM" | "OWNER" | "BORROWER"

interface Props {
  bookingId:  string
  reviewType: ReviewType
  targetName: string
  existing?:  { rating: number; comment: string | null } | null
}

// P3-68: emoji de satisfação → valor 1–5
const EMOJIS: { emoji: string; label: string; value: number }[] = [
  { emoji: "😠", label: "Muito insatisfeito", value: 1 },
  { emoji: "😕", label: "Insatisfeito",       value: 2 },
  { emoji: "😐", label: "Neutro",             value: 3 },
  { emoji: "😊", label: "Satisfeito",         value: 4 },
  { emoji: "😍", label: "Muito satisfeito",   value: 5 },
]

const STAR_LABEL = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"]

// P3-67: critérios por tipo de avaliação
const CRITERIA: Record<ReviewType, { key: string; label: string }[]> = {
  ITEM: [
    { key: "itemAsDescribed", label: "Item como descrito" },
    { key: "conservation",    label: "Estado de conservação" },
  ],
  OWNER: [
    { key: "punctuality",  label: "Pontualidade" },
    { key: "communication", label: "Comunicação" },
  ],
  BORROWER: [
    { key: "punctuality",   label: "Pontualidade" },
    { key: "communication", label: "Comunicação" },
    { key: "conservation",  label: "Cuidado com o item" },
  ],
}

const TITLE: Record<ReviewType, string> = {
  ITEM:     "Avalie o item",
  OWNER:    "Avalie o proprietário",
  BORROWER: "Avalie o locatário",
}

type CriteriaState = Record<string, number>

function StarRow({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${s} estrela${s > 1 ? "s" : ""}`}
            className="text-xl leading-none focus:outline-none"
          >
            <span className={(hover || value) >= s ? "text-yellow-400" : "text-border"}>★</span>
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-xs text-muted-foreground">{STAR_LABEL[value]}</span>
      )}
    </div>
  )
}

export function ReviewForm({ bookingId, reviewType, targetName, existing }: Props) {
  const [sentiment,  setSentiment]  = useState<number>(0)
  const [rating,     setRating]     = useState<number>(existing?.rating ?? 0)
  const [ratingHov,  setRatingHov]  = useState(0)
  const [criteria,   setCriteria]   = useState<CriteriaState>({})
  const [comment,    setComment]    = useState(existing?.comment ?? "")
  // P3-69: foto
  const [photoUrl,   setPhotoUrl]   = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [done,    setDone]    = useState(!!existing)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  function handleSentiment(value: number) {
    setSentiment(value)
    if (rating === 0) setRating(value)
  }

  function handleCriterion(key: string, value: number) {
    setCriteria((prev) => {
      const next = { ...prev, [key]: value }
      const vals = Object.values(next).filter(Boolean)
      if (vals.length > 0) {
        setRating(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length))
      }
      return next
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("bucket", "booking-photos")
      const res  = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json() as { url?: string; error?: { message: string } }
      if (!res.ok) throw new Error(json.error?.message ?? "Erro no upload.")
      setPhotoUrl(json.url ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload da foto.")
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (rating === 0) { setError("Selecione uma nota."); return }
    setError("")
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        reviewType, rating, comment: comment.trim() || undefined,
        ...(sentiment  ? { sentiment }  : {}),
        ...criteria,
        ...(photoUrl   ? { photoUrl }   : {}),
      }
      const res  = await fetch(`/api/bookings/${bookingId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError((json as { error?: { message?: string } }).error?.message ?? "Erro ao enviar avaliação."); return }
      trackEvent({ name: "review_submitted", params: { review_type: reviewType, rating } })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar avaliação.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="font-semibold text-foreground">{TITLE[reviewType]}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-yellow-400 text-lg leading-none">
            {"★".repeat(rating)}{"☆".repeat(5 - rating)}
          </span>
          <span className="font-semibold text-success">Avaliação enviada</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
      <div>
        <p className="font-semibold text-foreground">{TITLE[reviewType]}</p>
        <p className="text-sm text-muted-foreground">{targetName}</p>
      </div>

      {/* P3-68: emoji de satisfação */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Como foi sua experiência?</p>
        <div className="flex gap-3" role="group" aria-label="Satisfação">
          {EMOJIS.map(({ emoji, label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSentiment(value)}
              aria-label={label}
              aria-pressed={sentiment === value}
              className={[
                "flex flex-col items-center gap-1 rounded-lg p-2 text-2xl transition-all",
                "min-w-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand",
                sentiment === value
                  ? "bg-brand/10 ring-2 ring-brand scale-110"
                  : "hover:bg-muted",
              ].join(" ")}
            >
              {emoji}
              <span className="text-[10px] text-muted-foreground leading-none">{label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* P3-67: critérios múltiplos */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Critérios</p>
        {CRITERIA[reviewType].map(({ key, label }) => (
          <StarRow
            key={key}
            label={label}
            value={criteria[key] ?? 0}
            onChange={(v) => handleCriterion(key, v)}
          />
        ))}
      </div>

      {/* Nota geral */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Nota geral</p>
        <div className="flex items-center gap-1" role="group" aria-label="Nota geral">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setRatingHov(s)}
              onMouseLeave={() => setRatingHov(0)}
              aria-label={`${s} estrela${s > 1 ? "s" : ""}`}
              className="text-2xl leading-none focus:outline-none"
            >
              <span className={(ratingHov || rating) >= s ? "text-yellow-400" : "text-border"}>★</span>
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">{STAR_LABEL[rating]}</span>
          )}
        </div>
      </div>

      {/* P3-69: foto do item em uso (apenas avaliação de ITEM) */}
      {reviewType === "ITEM" && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Foto do item em uso <span className="text-muted-foreground">(opcional)</span></p>
          {photoUrl ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Foto do item em uso" className="h-24 w-24 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                aria-label="Remover foto"
                className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:border-brand hover:text-brand transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {uploading ? "Enviando…" : "Adicionar foto"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Comentário opcional…"
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={rating === 0 || loading}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[44px]"
      >
        {loading ? "Enviando…" : "Enviar avaliação"}
      </button>
    </div>
  )
}
