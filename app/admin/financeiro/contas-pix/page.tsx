import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { PixAccountActions } from "./_PixAccountActions"

export const metadata: Metadata = { title: "Admin — Contas PIX" }

export default async function ContasPixPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
  if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")) redirect("/admin")

  const accounts = await prisma.ownerPaymentAccount.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id:         true,
      pixKeyType: true,
      pixKey:     true,
      holderName: true,
      bankName:   true,
      status:     true,
      createdAt:  true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  const pending  = accounts.filter((a) => a.status === "PENDING_VERIFICATION")
  const verified = accounts.filter((a) => a.status === "VERIFIED")
  const rejected = accounts.filter((a) => a.status === "REJECTED")

  const STATUS_COLOR: Record<string, string> = {
    PENDING_VERIFICATION: "text-yellow-700 bg-yellow-50 border-yellow-200",
    VERIFIED:             "text-green-700 bg-green-50 border-green-200",
    REJECTED:             "text-red-600 bg-red-50 border-red-200",
  }
  const STATUS_LABEL: Record<string, string> = {
    PENDING_VERIFICATION: "Aguardando",
    VERIFIED:             "Verificada",
    REJECTED:             "Rejeitada",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Contas PIX</h1>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-yellow-700 font-medium">{pending.length} pendentes</span>
          <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-green-700 font-medium">{verified.length} verificadas</span>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Nenhuma conta PIX cadastrada ainda.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="divide-y divide-border">
            {[...pending, ...verified, ...rejected].map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{a.user.name}</p>
                  <p className="text-xs text-muted-foreground">{a.user.email}</p>
                  <p className="text-xs text-foreground font-medium">
                    {a.pixKeyType}: <span className="font-mono">{a.pixKey}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.holderName}{a.bankName ? ` · ${a.bankName}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cadastrado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(a.createdAt))}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                  {a.status === "PENDING_VERIFICATION" && (
                    <PixAccountActions accountId={a.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
