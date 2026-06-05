import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Meus Repasses" }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "Aguardando",   color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  PROCESSING: { label: "Em processo",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  COMPLETED:  { label: "Pago",         color: "text-green-700 bg-green-50 border-green-200" },
  FAILED:     { label: "Falhou",       color: "text-red-600 bg-red-50 border-red-200" },
  BLOCKED:    { label: "Bloqueado",    color: "text-gray-600 bg-gray-50 border-gray-200" },
}

export default async function RepassesPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/repasses")

  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, pixKey: true, pixKeyType: true, holderName: true, status: true },
  })

  const payouts = account
    ? await prisma.payout.findMany({
        where:   { ownerPaymentAccountId: account.id },
        orderBy: { createdAt: "desc" },
        take:    50,
        select: {
          id:           true,
          amount:       true,
          status:       true,
          eligibleAfter: true,
          processedAt:  true,
          failureReason: true,
          booking: {
            select: {
              id:        true,
              startDate: true,
              endDate:   true,
              item:      { select: { title: true } },
            },
          },
        },
      })
    : []

  const totalPaid    = payouts.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0)
  const totalPending = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/perfil" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">

          <div>
            <h1 className="text-xl font-bold text-primary">Meus Repasses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Histórico de repasses das suas locações. Liberados 3 dias após a devolução confirmada.
            </p>
          </div>

          {/* Conta PIX cadastrada */}
          {account ? (
            <div className={`rounded-xl border p-4 text-sm ${
              account.status === "VERIFIED"
                ? "border-green-200 bg-green-50"
                : account.status === "REJECTED"
                ? "border-red-200 bg-red-50"
                : "border-yellow-200 bg-yellow-50"
            }`}>
              <p className={`font-semibold ${account.status === "VERIFIED" ? "text-green-700" : account.status === "REJECTED" ? "text-red-600" : "text-yellow-700"}`}>
                {account.status === "VERIFIED" ? "✓ Conta PIX verificada" : account.status === "REJECTED" ? "✗ Conta PIX rejeitada" : "⏳ Conta PIX aguardando verificação"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {account.pixKeyType}: {account.pixKey} · {account.holderName}
              </p>
              <Link href="/perfil/recebimentos" className="mt-1 inline-block text-xs underline hover:no-underline">
                Editar conta →
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">Cadastre sua chave PIX para receber repasses</p>
              <Link href="/perfil/recebimentos" className="mt-1 inline-block text-sm text-yellow-700 underline hover:no-underline">
                Cadastrar chave PIX →
              </Link>
            </div>
          )}

          {/* Resumo */}
          {payouts.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-2xl font-bold text-success">{fmt(totalPaid)}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">Total recebido</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{payouts.filter((p) => p.status === "COMPLETED").length} repasses</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-2xl font-bold text-primary">{fmt(totalPending)}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">A receber</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length} pendentes</p>
              </div>
            </div>
          )}

          {/* Lista de repasses */}
          {payouts.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
              Nenhum repasse ainda. Complete uma locação para receber.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="divide-y divide-border">
                {payouts.map((p) => {
                  const info = STATUS_LABEL[p.status] ?? STATUS_LABEL["BLOCKED"]
                  const fmtDate = (d: Date | string) =>
                    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d))
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.booking.item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(p.booking.startDate)} – {fmtDate(p.booking.endDate)}
                        </p>
                        {p.status === "PENDING" && (
                          <p className="text-xs text-muted-foreground">
                            Disponível em {fmtDate(p.eligibleAfter)}
                          </p>
                        )}
                        {p.processedAt && (
                          <p className="text-xs text-muted-foreground">
                            Pago em {fmtDate(p.processedAt)}
                          </p>
                        )}
                        {p.failureReason && (
                          <p className="text-xs text-red-600">{p.failureReason}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <p className="text-lg font-bold text-foreground">{fmt(p.amount)}</p>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
