import Image from "next/image"
import Link from "next/link"

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
  category:     { name: string }
  owner:        { name: string; isVerified: boolean }
  _count?:      { reviews: number; favorites: number }
}

interface ItemCardProps {
  item:         ItemCardItem
  showActions?: boolean
  onDelete?:   (id: string) => void
}

const CONDITION_LABEL: Record<string, string> = {
  NEW:       "Novo",
  EXCELLENT: "Excelente",
  GOOD:      "Bom",
  FAIR:      "Regular",
}

const CONDITION_COLOR: Record<string, string> = {
  NEW:       "bg-success/10 text-success",
  EXCELLENT: "bg-success/10 text-success",
  GOOD:      "bg-brand/10 text-brand",
  FAIR:      "bg-muted text-muted-foreground",
}

export function ItemCard({ item, showActions = false, onDelete }: ItemCardProps) {
  const imageUrl = item.images[0]?.url
  const price    = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                      .format(item.pricePerDay / 100)
  const location = item.neighborhood
    ? `${item.neighborhood}, ${item.city}`
    : item.city

  return (
    <article
      className={[
        "group flex flex-col rounded-lg border border-border bg-surface",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        item.isActive === false ? "opacity-60" : "",
      ].join(" ")}
    >
      <Link href={`/itens/${item.id}`} className="block flex-1">
        {/* Imagem */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${CONDITION_COLOR[item.condition] ?? "bg-muted text-muted-foreground"}`}>
              {CONDITION_LABEL[item.condition] ?? item.condition}
            </span>
            {item.isActive === false && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Pausado
              </span>
            )}
          </div>

          {/* Verificado */}
          {item.owner.isVerified && (
            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-success/90 text-white" title="Anunciante verificado">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          <p className="mb-1 text-xs text-muted-foreground">{item.category.name}</p>
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-primary transition-colors group-hover:text-brand">
            {item.title}
          </h3>
          <p className="mb-3 text-lg font-bold text-brand">
            {price}
            <span className="text-xs font-normal text-muted-foreground">/dia</span>
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}, {item.state}
          </div>
        </div>
      </Link>

      {/* Ações do proprietário */}
      {showActions && (
        <div className="flex gap-2 border-t border-border p-3">
          <Link
            href={`/itens/${item.id}/editar`}
            className="flex-1 rounded-md border border-border py-1.5 text-center text-xs font-medium text-foreground hover:bg-background transition-colors"
          >
            Editar
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="flex-1 rounded-md border border-destructive/30 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
            >
              Remover
            </button>
          )}
        </div>
      )}
    </article>
  )
}
