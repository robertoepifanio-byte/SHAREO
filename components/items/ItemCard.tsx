import Image from "next/image"
import Link from "next/link"
import { FavoriteButton } from "./FavoriteButton"

interface ItemCardItem {
  id:           string
  title:        string
  pricePerDay:  number
  condition:    string
  city:         string
  state:        string
  neighborhood?: string | null
  isActive?:    boolean
  images:       { url: string }[]
  category:     { name: string } | null
  owner:        { name: string; isVerified: boolean } | null
  _count?:      { reviews: number; favorites: number; bookings?: number | null }
  avgRating?:   number | null
  distanceKm?:  number | null
}

interface ItemCardProps {
  item:             ItemCardItem
  showActions?:     boolean
  isFavorited?:     boolean
  hotBadge?:        boolean
  toggling?:        boolean
  onDelete?:        (id: string) => void
  onToggleActive?:  (id: string, currentIsActive: boolean) => void
}

export function ItemCard({ item, showActions = false, isFavorited = false, hotBadge = false, toggling = false, onDelete, onToggleActive }: ItemCardProps) {
  const imageUrl = item.images[0]?.url
  const price    = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                      .format(item.pricePerDay / 100)
  const location = item.neighborhood
    ? `${item.neighborhood}, ${item.city}`
    : item.city

  const isActive  = item.isActive !== false
  const isBooked  = (item._count?.bookings ?? 0) > 0

  return (
    <article
      className={[
        "group flex flex-col rounded-lg border border-border bg-surface",
        "shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        !isActive ? "opacity-60" : "",
      ].join(" ")}
    >
      <Link href={`/itens/${item.id}`} className="block flex-1 rounded-t-lg outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
        {/* Imagem */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}

          {/* Badge de disponibilidade */}
          <div className="absolute left-2 top-2">
            {!isActive ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Pausado
              </span>
            ) : isBooked ? (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                Reservado
              </span>
            ) : (
              <span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold text-white">
                Disponível
              </span>
            )}
          </div>

          {/* Badge "Mais alugado" */}
          {hotBadge && (
            <div className="absolute bottom-2 left-2 rounded-full bg-[#C05800] px-2 py-0.5 text-[10px] font-bold text-white">
              🔥 Mais alugado
            </div>
          )}

          {/* Favorito — apenas em listagens públicas */}
          {!showActions && (
            <FavoriteButton itemId={item.id} initialFavorited={isFavorited} />
          )}

          {/* Verificado */}
          {item.owner?.isVerified && (
            <div
              className="absolute right-2 bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-success/90 text-white"
              title="Anunciante verificado"
              aria-label="Anunciante verificado"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-3">
          <p className="mb-0.5 text-xs text-muted-foreground">{item.category?.name}</p>
          <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-primary transition-colors group-hover:text-brand">
            {item.title}
          </h3>

          {/* Rating */}
          {item.avgRating != null && item._count && item._count.reviews > 0 && (
            <div className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{item.avgRating.toFixed(1)}</span>
              <span>({item._count.reviews})</span>
            </div>
          )}

          <p className="mb-2 text-xl font-extrabold text-brand">
            {price}<span className="text-xs font-normal text-muted-foreground">/dia</span>
          </p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {location}
            {item.distanceKm != null && item.distanceKm > 0 && (
              <span aria-label={`a ${item.distanceKm.toFixed(1)} km de você`}>
                {" "}•{" "}{item.distanceKm.toFixed(1)} km
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Ações do proprietário */}
      {showActions && (
        <div className="flex flex-col gap-1.5 border-t border-border p-3">
          <div className="flex gap-2">
            <Link
              href={`/itens/${item.id}/editar`}
              className="flex-1 rounded-md border border-border py-1.5 text-center text-xs font-medium text-foreground hover:bg-background transition-colors"
            >
              Editar
            </Link>
            {onToggleActive && (
              <button
                onClick={() => onToggleActive(item.id, isActive)}
                disabled={toggling}
                className={[
                  "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  isActive
                    ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                    : "border-success/40 text-success hover:bg-success/5",
                ].join(" ")}
              >
                {toggling ? "…" : isActive ? "Pausar" : "Reativar"}
              </button>
            )}
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="w-full rounded-md border border-destructive/30 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
            >
              Remover
            </button>
          )}
        </div>
      )}
    </article>
  )
}
