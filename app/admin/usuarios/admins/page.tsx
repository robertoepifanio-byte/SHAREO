import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { AdminActions } from "./_AdminActions"
import { CreateAdminForm } from "./_CreateAdminForm"
import { PromoteUserForm } from "./_PromoteUserForm"
import { formatDateShort } from "@/utils/format"
import { StatusBadge } from "@/components/ui/StatusBadge"

export const metadata: Metadata = { title: "Admin — Gestão de Admins" }

const ROLE_BADGE: Record<string, { label: string; variant: "brand" | "warning" | "info" }> = {
  ADMIN_SUPERADMIN:  { label: "Superadmin",  variant: "brand" },
  ADMIN_FINANCEIRO:  { label: "Financeiro",  variant: "warning" },
  ADMIN_OPERACIONAL: { label: "Operacional", variant: "info" },
}

export default async function AdminsPage() {
  const session = await requireAdminPage("ADMIN_SUPERADMIN")

  const admins = await prisma.user.findMany({
    where:   { role: "ADMIN", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select:  { id: true, name: true, email: true, adminRole: true, isActive: true, createdAt: true },
  })

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
                            <StatusBadge variant="danger" size="sm"> inativo</StatusBadge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-2 py-3 sm:table-cell">
                    {badge ? (
                      <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">
                    {formatDateShort(admin.createdAt)}
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
