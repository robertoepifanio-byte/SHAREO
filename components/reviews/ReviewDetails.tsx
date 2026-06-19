// P3-67/68/69: exibição dos detalhes extras de uma avaliação
// (emoji de satisfação, critérios por estrela e foto do item em uso).
// Server-compatible — sem hooks.

import Image from "next/image"

const SENTIMENT_EMOJI: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "😠", label: "Muito insatisfeito" },
  2: { emoji: "😕", label: "Insatisfeito" },
  3: { emoji: "😐", label: "Neutro" },
  4: { emoji: "😊", label: "Satisfeito" },
  5: { emoji: "😍", label: "Muito satisfeito" },
}

const CRITERIA_LABELS: Record<string, string> = {
  itemAsDescribed: "Como descrito",
  conservation:    "Conservação",
  punctuality:     "Pontualidade",
  communication:   "Comunicação",
}

export interface ReviewDetailsData {
  sentiment?:       number | null
  itemAsDescribed?: number | null
  punctuality?:     number | null
  communication?:   number | null
  conservation?:    number | null
  photoUrl?:        string | null
}

export function ReviewSentiment({ sentiment }: { sentiment?: number | null }) {
  if (!sentiment || !SENTIMENT_EMOJI[sentiment]) return null
  const { emoji, label } = SENTIMENT_EMOJI[sentiment]
  return (
    <span className="text-base leading-none" role="img" aria-label={label} title={label}>
      {emoji}
    </span>
  )
}

export function ReviewDetails({ review }: { review: ReviewDetailsData }) {
  const criteria = (Object.keys(CRITERIA_LABELS) as (keyof ReviewDetailsData)[])
    .map((key) => ({ key, label: CRITERIA_LABELS[key]!, value: review[key] as number | null | undefined }))
    .filter((c) => typeof c.value === "number" && c.value >= 1 && c.value <= 5)

  if (criteria.length === 0 && !review.photoUrl) return null

  return (
    <div className="mt-2 space-y-2">
      {criteria.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {criteria.map(({ key, label, value }) => (
            <span key={key} className="text-xs text-muted-foreground">
              {label}: <span className="text-yellow-500" aria-label={`${value} de 5`}>{"★".repeat(value!)}</span>
            </span>
          ))}
        </div>
      )}
      {review.photoUrl && (
        <Image
          src={review.photoUrl}
          alt="Foto do item em uso enviada na avaliação"
          width={80}
          height={80}
          className="h-20 w-20 rounded-lg border border-border object-cover"
        />
      )}
    </div>
  )
}
