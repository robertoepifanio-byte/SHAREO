"use client"

/**
 * P2-62 — Prévia em tempo real do ItemCard com os dados do formulário.
 * Usado como sidebar no desktop e seção inferior no mobile.
 * Replica visualmente o ItemCard sem precisar de dados do banco.
 */

interface Props {
  title:        string
  pricePerDay:  string   // ex.: "35,00"
  categoryName: string
  city:         string
  previewUrl?:  string   // URL da primeira imagem (objeto URL ou URL do Supabase)
}

function parseCents(display: string): number {
  const n = parseFloat(display.replace(",", "."))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function fmtCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function ItemCardPreview({ title, pricePerDay, categoryName, city, previewUrl }: Props) {
  const cents       = parseCents(pricePerDay)
  const displayTitle = title.trim() || "Título do seu anúncio"
  const displayCity  = city.trim()  || "Sua cidade"
  const displayCat   = categoryName || "Categoria"
  const displayPrice = cents > 0 ? fmtCurrency(cents) : "R$ 0,00"

  return (
    <div aria-label="Prévia do anúncio" className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Prévia do card
      </p>
      <div className="flex flex-col rounded-lg border border-border bg-surface shadow-sm max-w-[200px]">
        {/* Imagem */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Prévia da capa"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-3">
          <p className="mb-0.5 text-[10px] text-muted-foreground">{displayCat}</p>
          <h3 className="mb-1.5 line-clamp-2 text-xs font-semibold leading-snug text-primary">
            {displayTitle}
          </h3>
          <p className="mb-2 text-base font-extrabold text-brand">
            {displayPrice}
            <span className="text-[10px] font-normal text-muted-foreground">/dia</span>
          </p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {displayCity}
          </div>
        </div>
      </div>
    </div>
  )
}
