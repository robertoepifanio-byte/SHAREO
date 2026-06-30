import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { PixAccountForm } from "./_PixAccountForm"
import { getPlatformFeeRate } from "@/lib/platform-config"
import { isMercadoPagoActive } from "@/lib/mercadopago"

export const metadata: Metadata = { title: "Conta de Recebimento PIX" }

// Mensagens do retorno do OAuth do Mercado Pago (?mp=...).
// `sem_conta` não deve mais ocorrer após o desacoplamento PIX (upsert no callback),
// mas mantida para compatibilidade com deploys antigos em staging.
const MP_STATUS: Record<string, { ok: boolean; msg: string }> = {
  conectado:  { ok: true,  msg: "Conta Mercado Pago conectada com sucesso." },
  cancelado:  { ok: false, msg: "Conexão com o Mercado Pago cancelada." },
  sem_conta:  { ok: false, msg: "Não foi possível criar sua conta de recebimento. Tente novamente." },
  erro_state: { ok: false, msg: "Sessão de conexão expirada. Tente novamente." },
  erro:       { ok: false, msg: "Não foi possível conectar ao Mercado Pago. Tente novamente." },
}

export default async function RecebimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/recebimentos")

  const [account, feeRateBps, mpActive] = await Promise.all([
    prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
      select: {
        id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true,
        mpConnectedAt: true, mpLiveMode: true,
      },
    }),
    getPlatformFeeRate(),
    isMercadoPagoActive(),
  ])
  const feeLabel = `${feeRateBps / 100}%`
  const mpStatus = MP_STATUS[(await searchParams).mp ?? ""]

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg space-y-6">

          <div>
            <h1 className="text-xl font-bold text-primary">Conta de Recebimento PIX</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre a chave PIX para receber os repasses das suas locações.
              O valor fica retido na plataforma até o repasse semanal (toda segunda-feira).
            </p>
          </div>

          {mpStatus && (
            <div
              role="status"
              className={`rounded-lg border p-3 text-sm ${
                mpStatus.ok
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {mpStatus.msg}
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-5">
            <PixAccountForm existing={account} />
          </div>

          {/* Mercado Pago — Modelo B / split (só aparece com a flag ativa). ADR-026. */}
          {mpActive && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <h2 className="font-semibold text-foreground">Receber pelo Mercado Pago</h2>
              {account?.mpConnectedAt ? (
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 text-sm text-success">
                    <span aria-hidden="true">✅</span>
                    Conta conectada{account.mpLiveMode ? "" : " (ambiente de teste)"}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Os repasses das suas locações cairão automaticamente na sua conta Mercado Pago,
                    já com a taxa ShareO de {feeLabel} descontada.
                  </p>
                  <a
                    href="/api/payments/mp/connect"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline"
                  >
                    Reconectar conta
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta Mercado Pago para receber os repasses automaticamente,
                    sem espera pelo repasse manual.
                  </p>
                  <a
                    href="/api/payments/mp/connect"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Conectar Mercado Pago
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Como funciona */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Como funciona o repasse</h2>
            {[
              { icon: "✅", title: "Devolução confirmada", desc: "Locatário e você confirmam a devolução do item." },
              { icon: "⏳", title: "Repasse semanal", desc: "O valor fica retido até a próxima segunda-feira (feriado: primeiro dia útil seguinte)." },
              { icon: "💸", title: "Repasse via PIX", desc: `O valor líquido (após a taxa ShareO de ${feeLabel}) é enviado para a sua chave cadastrada.` },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-lg flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
