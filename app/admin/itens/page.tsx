import type { Metadata } from "next"
import type { Prisma } from "@prisma/client"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { prisma } from "@/lib/prisma"
import { ItemActions } from "./_Actions"
import { SearchRadiusForm } from "./_SearchRadiusForm"
import { formatPrice } from "@/utils/format"
import { getSearchMaxDistanceKm, SEARCH_MAX_DISTANCE_LIMIT_KM } from "@/lib/platform-config"

export const metadata: Metadata = { title: "Admin — Itens" }

// Filtro por GET (?q=&status=): Server Component puro, sem JS no cliente, e o
// link filtrado pode ser compartilhado. Antes a página listava os 100 mais
// recentes sem busca — achar os itens "[TESTE D0]" para pausar exigia rolar.
const FILTROS_STATUS = {
  todos:     { label: "Todos",      where: {} },
  pendentes: { label: "Pendentes",  where: { isApproved: false } },
  AVAILABLE: { label: "Publicados", where: { isApproved: true, status: "AVAILABLE" } },
  PAUSED:    { label: "Pausados",   where: { status: "PAUSED" } },
  DRAFT:     { label: "Rascunhos",  where: { status: "DRAFT" } },
} satisfies Record<string, { label: string; where: Prisma.ItemWhereInput }>
type FiltroStatus = keyof typeof FILTROS_STATUS

export default async function AdminItensPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const sp     = await searchParams
  const q      = (sp.q ?? "").trim().slice(0, 100)
  const status = (sp.status && Object.hasOwn(FILTROS_STATUS, sp.status) ? sp.status : "todos") as FiltroStatus

  const session = await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")

  const maxDistanceKm = await getSearchMaxDistanceKm()
  // PATCH /api/admin/platform-config exige ADMIN_SUPERADMIN. Sem esta checagem o
  // ADMIN_OPERACIONAL — que também acessa esta página — veria um formulário
  // editável e tomaria 403 ao salvar: a permissão precisa aparecer na UI, não só
  // no servidor.
  const podeEditarConfig = hasAdminRole(session, "ADMIN_SUPERADMIN")

  const items = await prisma.item.findMany({
    where:   {
      deletedAt: null,
      ...FILTROS_STATUS[status].where,
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { owner: { name:  { contains: q, mode: "insensitive" } } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }),
    },
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    take:    100,
    select: {
      id:          true,
      title:       true,
      pricePerDay: true,
      isApproved:  true,
      status:      true,
      createdAt:   true,
      category:    { select: { name: true } },
      owner:       { select: { name: true, email: true } },
      _count:      { select: { bookings: true } },
    },
  })

  // Com filtro ativo, uma tabela só: a divisão pendentes/aprovados esvaziava
  // "Todos os itens" ao filtrar por Pendentes.
  const filtrado = Boolean(q) || status !== "todos"
  const pending  = filtrado ? [] : items.filter((i) => !i.isApproved)
  const approved = filtrado ? items : items.filter((i) =>  i.isApproved)

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
        {formatPrice(item.pricePerDay)}/dia
      </td>
      <td className="px-2 py-3 hidden md:table-cell">
        <div className="flex gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isApproved ? "bg-success/10 text-success" : "bg-orange-light text-orange-link"}`}>
            {item.isApproved ? "Aprovado" : "Pendente"}
          </span>
          {item.status === "PAUSED" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Pausado
            </span>
          )}
          {item.status === "DRAFT" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Rascunho
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pl-2">
        <ItemActions itemId={item.id} isApproved={item.isApproved} status={item.status} />
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

      <section className="mb-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Alcance da busca</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Distância máxima considerada quando o visitante ordena por{" "}
          <strong className="font-medium text-foreground">Mais próximos</strong> em /itens.
          Não afeta as outras ordenações — nelas o catálogo inteiro continua visível.
        </p>
        {podeEditarConfig ? (
          <SearchRadiusForm maxDistanceKm={maxDistanceKm} limiteKm={SEARCH_MAX_DISTANCE_LIMIT_KM} />
        ) : (
          <p className="text-sm text-foreground">
            Atualmente <strong className="font-semibold">{maxDistanceKm} km</strong>.{" "}
            <span className="text-muted-foreground">Só o superadmin pode alterar.</span>
          </p>
        )}
      </section>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Buscar
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Título, nome ou e-mail do proprietário"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Status
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground"
          >
            {Object.entries(FILTROS_STATUS).map(([valor, f]) => (
              <option key={valor} value={valor}>{f.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          Filtrar
        </button>
        {filtrado && (
          <a href="/admin/itens" className="flex min-h-11 items-center px-2 text-sm text-muted-foreground underline">
            Limpar
          </a>
        )}
      </form>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-link">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-light text-xs text-orange-link">{pending.length}</span>
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
          <p className="py-8 text-center text-sm text-muted-foreground">
            {filtrado ? "Nenhum item encontrado com esse filtro." : "Nenhum item cadastrado."}
          </p>
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
