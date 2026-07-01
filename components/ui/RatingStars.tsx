interface Props {
  rating:     number
  showValue?: boolean
  count?:     number
  size?:      "sm" | "md"
  className?: string
}

export function RatingStars({ rating, showValue = false, count, size = "sm", className = "" }: Props) {
  const rounded = Math.round(rating)
  const textSize = size === "md" ? "text-sm" : "text-xs"

  return (
    <span
      role="img"
      className={`inline-flex items-center gap-1 ${textSize} ${className}`}
      aria-label={`${rating.toFixed(1)} estrelas${count != null ? `, ${count} avaliações` : ""}`}
    >
      <span className="text-yellow-400" aria-hidden="true">
        {"★".repeat(rounded)}{"☆".repeat(5 - rounded)}
      </span>
      {showValue && (
        <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
      )}
      {count != null && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </span>
  )
}
