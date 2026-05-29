import Image from "next/image"
import Link from "next/link"

interface Props {
  item: {
    id:         string
    title:      string
    pricePerDay: number
    images:     { url: string }[]
  }
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

export function SuggestCard({ item }: Props) {
  const imageUrl = item.images[0]?.url

  return (
    <Link
      href={`/itens/${item.id}`}
      className="group min-w-[140px] overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md flex-shrink-0"
      aria-label={item.title}
    >
      <div className="relative h-[90px] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="160px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
          {item.title}
        </p>
        <p className="mt-1 text-sm font-bold text-brand">
          {fmt(item.pricePerDay)}
          <span className="text-[10px] font-normal text-muted-foreground">/dia</span>
        </p>
      </div>
    </Link>
  )
}
