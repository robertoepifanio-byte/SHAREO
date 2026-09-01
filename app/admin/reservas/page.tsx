import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { prisma } from "@/lib/prisma"
import {
  getAutoCancelConfig,
  AUTO_CANCEL_PENDING_HOURS_MIN,
  AUTO_CANCEL_PENDING_HOURS_MAX,
} from "@/lib/platform-config"
import { AutoCancelForm } from "./_AutoCancelForm"
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge"
import { formatPrice, formatDateTime } from "@/utils/format"

export const metadata: Metadata = { title: "Admin — Reservas" }

// Cron roda a cada 6h (schedule "20 *\/6 * * *" em vercel.json).
const CRON_INTERVAL_HOURS = 6

export default async function AdminReservasPage() {
  const session = await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")

  // PATCH /api/admin/platform-config exige ADMIN_SUPERADMIN. Sem esta checagem o
  // ADMIN_OPERACIONAL — que também acessa esta página — veria o formulário editável
  // e tomaria 403 ao salvar. A permissão precisa aparecer na UI, não só no servidor.
  const podeEditar = hasAdminRole(session, "ADMIN_SUPERADMIN")

  const [{ pendingHours }, pendingBookings] = await Promise.all([
    getAutoCancelConfig(),
    prisma.booking.findMany({
      where:   { status: "PENDING", deletedAt: null },
      orderBy: { createdAt: "asc" },
      take:    50,
      select: {
        id:        true,
        createdAt: true,
        totalPrice: true,
        item:     { select: { title: true } },
        owner:    { select: { name: true } },
        borrower: { select: { name: true } },
        status:   true,
        disputeStatus: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary">Reservas</h1>

      {/* ── Configuração de auto-cancelamento ── */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Prazo de auto-cancelamento (PENDING sem resposta)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando o proprietário não responde a uma solicitação dentro deste prazo,
            a reserva é cancelada automaticamente e o locatário é notificado.
            Alterações entram em vigor na próxima execução do cron (máx. {CRON_INTERVAL_HOURS}h).
          </p>
        </div>

        <AutoCancelForm
          currentHours={pendingHours}
          podeEditar={podeEditar}
          min={AUTO_CANCEL_PENDING_HOURS_MIN}
          max={AUTO_CANCEL_PENDING_HOURS_MAX}
          cronIntervalHours={CRON_INTERVAL_HOURS}
        />
      </div>

      {/* ── Reservas PENDING aguardando resposta ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">
            Aguardando resposta do proprietário
            {pendingBookings.length > 0 && (
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                {pendingBookings.length}
              </span>
            )}
          </h2>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhuma reserva aguardando resposta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-3 py-3 font-medium hidden sm:table-cell">Locatário</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Proprietário</th>
                  <th className="px-3 py-3 font-medium whitespace-nowrap">Criada em</th>
                  <th className="px-3 py-3 font-medium text-right">Valor</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingBookings.map((b) => {
                  const ageHours = (Date.now() - new Date(b.createdAt).getTime()) / 3_600_000
                  const expiring = ageHours >= pendingHours * 0.75 // >= 75% do prazo

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-background transition-colors ${expiring ? "bg-yellow-50/50" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground line-clamp-1">{b.item.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{b.id.slice(-8)}</p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">
                        {b.borrower.name}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">
                        {b.owner.name}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(b.createdAt)}
                        {expiring && (
                          <span className="ml-1 text-yellow-600 font-semibold" title="Próxima do prazo de auto-cancelamento">
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-foreground whitespace-nowrap">
                        {formatPrice(b.totalPrice)}
                      </td>
                      <td className="px-3 py-3">
                        <BookingStatusBadge status={b.status as Parameters<typeof BookingStatusBadge>[0]["status"]} disputeStatus={b.disputeStatus} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
