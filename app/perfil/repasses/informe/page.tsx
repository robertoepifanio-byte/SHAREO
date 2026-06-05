import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Informe de Rendimentos" }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d))

export default async function InformeRendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/repasses/informe")

  const params  = await searchParams
  const currentYear = new Date().getFullYear()
  const year    = params.year ? parseInt(params.year, 10) : currentYear
  const validYear = !isNaN(year) && year >= 2024 && year <= currentYear ? year : currentYear

  const start = new Date(`${validYear}-01-01T00:00:00.000Z`)
  const end   = new Date(`${validYear}-12-31T23:59:59.999Z`)

  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, holderName: true, pixKey: true, pixKeyType: true },
  })

  const payouts = account
    ? await prisma.payout.findMany({
        where: {
          ownerPaymentAccountId: account.id,
          status:                "COMPLETED",
          processedAt:           { gte: start, lte: end },
        },
        select: {
          id:          true,
          amount:      true,
          processedAt: true,
          booking: {
            select: {
              id:        true,
              startDate: true,
              endDate:   true,
              item:      { select: { title: true } },
            },
          },
        },
        orderBy: { processedAt: "asc" },
      })
    : []

  const total = payouts.reduce((s, p) => s + p.amount, 0)

  const years = Array.from(
    { length: currentYear - 2024 + 1 },
    (_, i) => currentYear - i,
  )

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/perfil/repasses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Meus Repasses
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-primary">Informe de Rendimentos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Valores recebidos via repasse ShareO — use para declaração do Imposto de Renda.
              </p>
            </div>

            {/* Seletor de ano */}
            <form method="GET" className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-sm text-muted-foreground">Ano</label>
              <select
                id="year-select"
                name="year"
                defaultValue={validYear}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"

              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Ver
              </button>
            </form>
          </div>

          {/* Card de totais — destaque para IR */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total recebido em {validYear}
            </p>
            <p className="mt-1 text-3xl font-bold text-primary">{fmt(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {payouts.length} repasse{payouts.length !== 1 ? "s" : ""} concluído{payouts.length !== 1 ? "s" : ""}
            </p>
            {account && (
              <p className="mt-2 text-xs text-muted-foreground">
                Titular: {account.holderName} · {account.pixKeyType}: {account.pixKey}
              </p>
            )}
          </div>

          {/* Aviso IR */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <p className="font-semibold">ℹ️ Declaração de Imposto de Renda</p>
            <p className="mt-1">
              Rendimentos de locação devem ser declarados na ficha <strong>Rendimentos Tributáveis Recebidos de Pessoa Jurídica</strong> (CNPJ da ShareO) ou como <strong>Rendimentos de Aluguéis</strong>, dependendo da sua situação.
              Consulte seu contador.
            </p>
          </div>

          {/* Tabela de repasses */}
          {payouts.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
              Nenhum repasse recebido em {validYear}.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Detalhamento — {validYear}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {payouts.map((p, i) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{p.booking.item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Locação: {fmtDate(p.booking.startDate)} – {fmtDate(p.booking.endDate)}
                      </p>
                      {p.processedAt && (
                        <p className="text-xs text-muted-foreground">
                          Recebido em: {fmtDate(p.processedAt)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">{fmt(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">#{i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
                <p className="text-sm font-semibold text-foreground">Total</p>
                <p className="text-sm font-bold text-primary">{fmt(total)}</p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
