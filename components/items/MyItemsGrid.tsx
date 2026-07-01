"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ItemCard } from "@/components/items/ItemCard"
import { EmptyState } from "@/components/shared/EmptyState"

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
        toast.success("Anúncio removido com sucesso")
      } else {
        const json = await res.json()
        const msg = json.error?.message ?? "Erro ao remover anúncio."
        setError(msg)
        toast.error(msg)
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
      toast.error("Erro inesperado. Tente novamente.")
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
        toast.success(newStatus === "PAUSED" ? "Anúncio pausado" : "Anúncio reativado")
      } else {
        const json = await res.json()
        const msg = json.error?.message ?? "Erro ao atualizar anúncio."
        setError(msg)
        toast.error(msg)
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
      toast.error("Erro inesperado. Tente novamente.")
    } finally {
      setToggling(null)
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhum anúncio ainda"
        description="Comece a ganhar dinheiro alugando o que você tem."
        action={
          <Link
            href="/itens/novo"
            className="inline-flex items-center gap-1.5 h-10 px-6 rounded-md bg-brand text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Criar primeiro anúncio
          </Link>
        }
      />
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
              backHref="/meus-anuncios"
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
