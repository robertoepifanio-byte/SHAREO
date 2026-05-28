import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { UserActions } from "./_Actions"

export const metadata: Metadata = { title: "Admin — Usuários" }

export default async function AdminUsuariosPage() {
  const users = await prisma.user.findMany({
    where:   { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take:    200,
    select: {
      id:         true,
      name:       true,
      email:      true,
      userType:   true,
      role:       true,
      isVerified: true,
      isActive:   true,
      createdAt:  true,
      _count: {
        select: {
          items:             { where: { deletedAt: null } },
          bookingsAsBorrower: true,
          bookingsAsOwner:    true,
        },
      },
    },
  })

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).format(d)

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-primary">
        Usuários
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({users.length} total)
        </span>
      </h1>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2.5 pr-3 text-left text-xs font-semibold text-muted-foreground">Nome / E-mail</th>
              <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground sm:table-cell">Tipo</th>
              <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground md:table-cell">Itens / Reservas</th>
              <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground lg:table-cell">Desde</th>
              <th className="py-2.5 pl-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {user.name[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.name}
                        {user.role === "ADMIN" && (
                          <span className="ml-1 rounded-sm bg-primary/10 px-1 text-[10px] font-bold text-primary">ADMIN</span>
                        )}
                        {user.isVerified && (
                          <span className="ml-1 text-success text-xs">✓</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-2 py-3 text-xs text-muted-foreground sm:table-cell">
                  {user.userType}
                </td>
                <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">
                  {user._count.items} itens · {user._count.bookingsAsBorrower + user._count.bookingsAsOwner} reservas
                </td>
                <td className="hidden px-2 py-3 text-xs text-muted-foreground lg:table-cell">
                  {fmtDate(user.createdAt)}
                </td>
                <td className="py-3 pl-2">
                  {user.role === "ADMIN" ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <UserActions userId={user.id} isActive={user.isActive} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
