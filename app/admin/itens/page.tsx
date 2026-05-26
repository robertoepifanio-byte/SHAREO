import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { ItemActions } from "./_Actions"

export const metadata: Metadata = { title: "Admin — Itens | ShareO" }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

export default async function AdminItensPage() {
  const items = await prisma.item.findMany({
    where:   { deletedAt: null },
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    take:    100,
    select: {
      id:          true,
      title:       true,
      pricePerDay: true,
      isApproved:  true,
      isActive:    true,
      createdAt:   true,
      category:    { select: { name: true } },
      owner:       { select: { name: true, email: true } },
      _count:      { select: { bookings: true } },
    },
  })

  const pending  = items.filter((i) => !i.isApproved)
  const approved = items.filter((i) =>  i.isApproved)

  const ItemRow = ({ item }: { item: typeof items[number] }) => (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-3">
        <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.owner.name}</p>
      </td>
      <td className="px-2 py-3 text-xs text-muted-foreground hidden sm:table-cell">
        {item.category?.name ?? "—"}
      </td>
      <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {fmt(item.pricePerDay)}/dia
      </td>
      <td className="px-2 py-3 hidden md:table-cell">
        <div className="flex gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isApproved ? "bg-success/10 text-success" : "bg-orange-100 text-orange-700"}`}>
            {item.isApproved ? "Aprovado" : "Pendente"}
          </span>
          {!item.isActive && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              Inativo
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pl-2">
        <ItemActions itemId={item.id} isApproved={item.isApproved} isActive={item.isActive} />
      </td>
    </tr>
  )

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-primary">
        Itens
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({items.length} total)
        </span>
      </h1>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs">{pending.length}</span>
            Aguardando aprovação
          </h2>
          <div className="overflow-hidden rounded-xl border border-orange-200 bg-surface">
            <table className="w-full">
              <tbody>
                {pending.map((item) => <ItemRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Todos os itens</h2>
        {approved.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold text-muted-foreground">Item / Proprietário</th>
                  <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground sm:table-cell">Categoria</th>
                  <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground">Preço</th>
                  <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground md:table-cell">Status</th>
                  <th className="py-2.5 pl-2 text-left text-xs font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((item) => <ItemRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
