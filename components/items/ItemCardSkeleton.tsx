/**
 * P2-46 — Skeleton do ItemCard
 * Replica a estrutura visual do ItemCard: imagem rect + título + 3 linhas de texto.
 * Usado no Suspense fallback da listagem de itens.
 *
 * WCAG: container com aria-busy="true" e aria-label para leitores de tela.
 */

import { Skeleton } from "@/components/ui/Skeleton"

interface ItemCardSkeletonProps {
  /** Número de skeletons a renderizar em série */
  count?: number
}

function SingleItemCardSkeleton() {
  return (
    <article
      className="overflow-hidden rounded-xl border border-border bg-surface"
      aria-label="Carregando anúncio…"
    >
      {/* Imagem retangular — proporção 4:3 */}
      <Skeleton className="aspect-[4/3] w-full rounded-none" />

      <div className="p-3 space-y-2">
        {/* Título */}
        <Skeleton className="h-4 w-3/4" />
        {/* Sub — categoria + localização */}
        <Skeleton className="h-3 w-1/2" />
        {/* Preço */}
        <Skeleton className="h-4 w-1/3" />
      </div>
    </article>
  )
}

export function ItemCardSkeleton({ count = 1 }: ItemCardSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando anúncios…"
      className="contents"
    >
      {Array.from({ length: count }, (_, i) => (
        <SingleItemCardSkeleton key={i} />
      ))}
      {/* Texto para leitores de tela */}
      <span className="sr-only">Carregando anúncios, aguarde…</span>
    </div>
  )
}
