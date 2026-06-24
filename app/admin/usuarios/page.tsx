import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { UserActions } from "./_Actions"
import { formatDateShort } from "@/utils/format"
import { StatusBadge } from "@/components/ui/StatusBadge"

export const metadata: Metadata = { title: "Admin — Usuários" }

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL", "ADMIN_FINANCEIRO")

  const q = (await searchParams).q?.trim() ?? ""

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name:  { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary">
          Usuários
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({users.length}{users.length === 200 ? "+" : ""}{q ? " encontrados" : " total"})
          </span>
        </h1>
        {hasAdminRole(session, "ADMIN_SUPERADMIN") && (
          <Link
            href="/admin/usuarios/admins"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            🔑 Gerenciar admins
          </Link>
        )}
      </div>

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail…"
          aria-label="Buscar usuário por nome ou e-mail"
          className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
        {q && (
          <Link
            href="/admin/usuarios"
            className="min-h-11 flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

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
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado para &quot;{q}&quot;.
                </td>
              </tr>
            )}
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
                          <StatusBadge variant="brand" size="sm"> ADMIN</StatusBadge>
                        )}
                        {user.isVerified && (
                          <StatusBadge variant="success" size="sm"> ✓</StatusBadge>
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
                  {formatDateShort(user.createdAt)}
                </td>
                <td className="py-3 pl-2">
                  {user.role === "ADMIN" || !hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL") ? (
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
