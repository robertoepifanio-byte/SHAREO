import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { AdminActions } from "./_AdminActions"
import { CreateAdminForm } from "./_CreateAdminForm"
import { PromoteUserForm } from "./_PromoteUserForm"

export const metadata: Metadata = { title: "Admin — Gestão de Admins" }

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN_SUPERADMIN:  { label: "Superadmin",  cls: "bg-primary/10 text-primary" },
  ADMIN_FINANCEIRO:  { label: "Financeiro",  cls: "bg-amber-100 text-amber-700" },
  ADMIN_OPERACIONAL: { label: "Operacional", cls: "bg-sky-100 text-sky-700" },
}

export default async function AdminsPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
  if (!hasAdminRole(session, "ADMIN_SUPERADMIN")) redirect("/admin")

  const admins = await prisma.user.findMany({
    where:   { role: "ADMIN", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select:  { id: true, name: true, email: true, adminRole: true, isActive: true, createdAt: true },
  })

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).format(d)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin/usuarios" className="hover:text-foreground transition-colors">Usuários</Link>
            <span>›</span>
            <span className="text-foreground font-medium">Administradores</span>
          </div>
          <h1 className="text-xl font-bold text-primary">
            Administradores
            <span className="ml-2 text-sm font-normal text-muted-foreground">({admins.length})</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Visível apenas para Superadmins. Todas as ações são auditadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PromoteUserForm />
          <CreateAdminForm />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2.5 pr-3 text-left text-xs font-semibold text-muted-foreground">Nome / E-mail</th>
              <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground sm:table-cell">Role</th>
              <th className="hidden px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground md:table-cell">Desde</th>
              <th className="py-2.5 pl-2 text-left text-xs font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const badge  = admin.adminRole ? ROLE_BADGE[admin.adminRole] : null
              const isSelf = admin.id === session.user.id
              return (
                <tr key={admin.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {admin.name[0]?.toUpperCase() ?? "A"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {admin.name}
                          {isSelf && <span className="ml-1.5 text-[10px] text-muted-foreground">(você)</span>}
                          {!admin.isActive && (
                            <span className="ml-1.5 rounded-sm bg-red-100 px-1 text-[10px] font-semibold text-red-600">inativo</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-2 py-3 sm:table-cell">
                    {badge ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">
                    {fmtDate(admin.createdAt)}
                  </td>
                  <td className="py-3 pl-2">
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <AdminActions
                        userId={admin.id}
                        adminRole={(admin.adminRole ?? "ADMIN_OPERACIONAL") as "ADMIN_SUPERADMIN" | "ADMIN_FINANCEIRO" | "ADMIN_OPERACIONAL"}
                        isActive={admin.isActive}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
