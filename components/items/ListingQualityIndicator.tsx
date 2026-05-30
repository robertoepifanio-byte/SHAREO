"use client"

/**
 * P2-62 — Indicador de qualidade do anúncio (0–100%).
 * Pontuação:
 *   título ≥ 5 chars    = 20 pts
 *   descrição ≥ 20 chars = 20 pts
 *   fotos ≥ 3           = 20 pts
 *   preço > 0           = 15 pts
 *   categoria           = 15 pts
 *   localização (city)  = 10 pts
 * Total máximo          = 100 pts
 */

interface Props {
  title:        string
  description:  string
  photoCount:   number
  pricePerDay:  string   // valor formatado (ex.: "35,00") — vazio = 0
  categoryId:   string
  city:         string
}

interface ScoreItem {
  label:   string
  points:  number
  earned:  boolean
}

export function ListingQualityIndicator({
  title, description, photoCount, pricePerDay, categoryId, city,
}: Props) {
  const items: ScoreItem[] = [
    { label: "Título",      points: 20, earned: title.trim().length >= 5 },
    { label: "Descrição",   points: 20, earned: description.trim().length >= 20 },
    { label: "3+ fotos",    points: 20, earned: photoCount >= 3 },
    { label: "Preço",       points: 15, earned: parseFloat(pricePerDay.replace(",", ".") || "0") > 0 },
    { label: "Categoria",   points: 15, earned: Boolean(categoryId) },
    { label: "Localização", points: 10, earned: city.trim().length >= 2 },
  ]

  const score = items.reduce((acc, i) => acc + (i.earned ? i.points : 0), 0)

  let label: string
  let colorClass: string
  if (score < 40) {
    label      = "Fraco"
    colorClass = "bg-destructive"
  } else if (score < 70) {
    label      = "Razoável"
    colorClass = "bg-amber-500"
  } else if (score < 100) {
    label      = "Bom"
    colorClass = "bg-brand"
  } else {
    label      = "Excelente"
    colorClass = "bg-success"
  }

  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      aria-label={`Qualidade do anúncio: ${score}% — ${label}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Qualidade do anúncio</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${colorClass}`}>
          {score}% — {label}
        </span>
      </div>

      {/* Barra de progresso */}
      <div
        className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Checklist de critérios */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Critérios de qualidade">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-1 text-[11px] font-medium ${
              item.earned ? "text-success" : "text-muted-foreground"
            }`}
          >
            {item.earned ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-success" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            )}
            {item.label}
            <span className="text-[10px] opacity-60">+{item.points}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
