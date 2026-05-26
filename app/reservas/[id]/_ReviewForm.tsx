"use client"

import { useState } from "react"

interface Props {
  bookingId:  string
  reviewType: "ITEM" | "OWNER" | "BORROWER"
  targetName: string
  existing?:  { rating: number; comment: string | null } | null
}

const TITLE: Record<Props["reviewType"], string> = {
  ITEM:     "Avalie o item",
  OWNER:    "Avalie o proprietário",
  BORROWER: "Avalie o locatário",
}

export function ReviewForm({ bookingId, reviewType, targetName, existing }: Props) {
  const [rating,  setRating]  = useState(existing?.rating ?? 0)
  const [hover,   setHover]   = useState(0)
  const [comment, setComment] = useState(existing?.comment ?? "")
  const [done,    setDone]    = useState(!!existing)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  async function submit() {
    if (rating === 0) { setError("Selecione uma nota."); return }
    setError("")
    setLoading(true)
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/reviews`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reviewType, rating, comment: comment.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? "Erro ao enviar avaliação.")
        return
      }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-semibold text-foreground">{TITLE[reviewType]}</p>
      <p className="mb-4 text-sm text-muted-foreground">{targetName}</p>

      {done ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-yellow-400 text-lg leading-none">
            {"★".repeat(rating)}{"☆".repeat(5 - rating)}
          </span>
          <span className="font-semibold text-success">Avaliação enviada</span>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-1" role="group" aria-label="Nota">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${s} estrela${s > 1 ? "s" : ""}`}
                className="text-2xl leading-none transition-colors focus:outline-none"
              >
                <span className={(hover || rating) >= s ? "text-yellow-400" : "text-border"}>
                  ★
                </span>
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 self-center text-sm text-muted-foreground">
                {["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"][rating]}
              </span>
            )}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Comentário opcional…"
            className="mb-3 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
          />

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={rating === 0 || loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Enviando…" : "Enviar avaliação"}
          </button>
        </>
      )}
    </div>
  )
}
