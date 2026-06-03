"use client"

import { useState } from "react"
import Link from "next/link"
import { ItemCard } from "@/components/items/ItemCard"

interface ItemSummary {
  id:           string
  title:        string
  pricePerDay:  number
  condition:    string
  city:         string
  state:        string
  neighborhood?: string | null
  status:       string
  images:       { url: string }[]
  category:     { name: string }
  owner:        { name: string; isVerified: boolean }
  _count:       { reviews: number; favorites: number }
}

interface MyItemsGridProps {
  initialItems: ItemSummary[]
}

export function MyItemsGrid({ initialItems }: MyItemsGridProps) {
  const [items,    setItems]    = useState(initialItems)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Remover este anúncio? Esta ação não pode ser desfeita.")) return

    setDeleting(id)
    setError(null)

    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" })
      if (res.ok || res.status === 204) {
        setItems((prev) => prev.filter((item) => item.id !== id))
      } else {
        const json = await res.json()
        setError(json.error?.message ?? "Erro ao remover anúncio.")
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setDeleting(null)
    }
  }

  async function handleToggleActive(id: string, currentStatus: string) {
    setToggling(id)
    setError(null)

    const newStatus = currentStatus === "AVAILABLE" ? "PAUSED" : "AVAILABLE"

    try {
      const res = await fetch(`/api/items/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
        )
      } else {
        const json = await res.json()
        setError(json.error?.message ?? "Erro ao atualizar anúncio.")
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setToggling(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <h3 className="mb-2 font-semibold text-primary">Nenhum anúncio ainda</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Comece a ganhar dinheiro alugando o que você tem.
        </p>
        <Link
          href="/itens/novo"
          className="inline-flex items-center gap-1.5 h-10 px-6 rounded-md bg-brand text-sm font-medium text-white hover:bg-brand-hover transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Criar primeiro anúncio
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className={deleting === item.id ? "pointer-events-none opacity-50" : ""}>
            {item.status === "DRAFT" && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 min-h-[44px]">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-300">
                  Rascunho
                </span>
                <p className="text-sm text-muted-foreground">
                  Adicione pelo menos 1 foto para publicar
                </p>
              </div>
            )}
            {item.status === "PAUSED" && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 min-h-[44px]">
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                  Pausado
                </span>
                <p className="text-sm text-muted-foreground">
                  Anúncio oculto das listagens públicas
                </p>
              </div>
            )}
            {item.status === "AVAILABLE" && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 min-h-[44px]">
                <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success border border-success/30">
                  Disponível
                </span>
              </div>
            )}
            <ItemCard
              item={item}
              showActions
              toggling={toggling === item.id}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
