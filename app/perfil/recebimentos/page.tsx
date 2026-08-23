import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { PixAccountForm } from "./_PixAccountForm"
import { getPlatformFeeRate, getPayoutWindowDays, formatPayoutWindow } from "@/lib/platform-config"
import { isMercadoPagoActive } from "@/lib/mercadopago"
import { isStripeConnectActive } from "@/lib/stripe-connect"

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

// Mensagens do retorno do onboarding Stripe Connect (?stripe=...).
const STRIPE_STATUS: Record<string, { ok: boolean; msg: string }> = {
  concluido:  { ok: true,  msg: "Dados enviados à Stripe. Assim que a verificação terminar, sua conta fica ativa para receber." },
  incompleto: { ok: false, msg: "O cadastro na Stripe ficou incompleto. Você pode retomar de onde parou a qualquer momento." },
  sem_conta:  { ok: false, msg: "Não foi possível encontrar sua conta de recebimento. Tente novamente." },
  erro:       { ok: false, msg: "Não foi possível conectar à Stripe. Tente novamente." },
}

export default async function RecebimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string; stripe?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/recebimentos")

  const [account, feeRateBps, payoutWindowDays, mpActive, stripeConnectActive] = await Promise.all([
    prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
      select: {
        id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true,
        mpConnectedAt: true, mpLiveMode: true,
        stripeAccountId: true, stripeConnectStatus: true, stripeChargesEnabled: true,
        stripePayoutsEnabled: true, stripeConnectedAt: true,
      },
    }),
    getPlatformFeeRate(),
    getPayoutWindowDays(),
    isMercadoPagoActive(),
    isStripeConnectActive(),
  ])
  const feeLabel    = `${feeRateBps / 100}%`
  const payoutLabel = formatPayoutWindow(payoutWindowDays)
  const params = await searchParams
  const mpStatus = MP_STATUS[params.mp ?? ""]
  const stripeStatus = STRIPE_STATUS[params.stripe ?? ""]
  const stripeReady = account?.stripeChargesEnabled && account?.stripePayoutsEnabled

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

          {/* 🪤 Esta tela abria com o formulário de PIX e o título "Conta de
              Recebimento PIX", com a Stripe num card secundário lá embaixo.
              Descrevia o mundo anterior à ADR-028: hoje o repasse automático é
              pela Stripe e o PIX é o caminho MANUAL, usado só por quem não
              conectou. O fundador abriu a tela procurando onde informar os dados
              da Stripe e não achou (23/08). A ordem agora segue a realidade. */}
          <div>
            <h1 className="text-xl font-bold text-primary">Como você recebe</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              O valor fica retido na plataforma por {payoutLabel} após a confirmação da
              devolução. Depois disso, o repasse sai pelo método que você tiver configurado
              abaixo.
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

          {stripeStatus && (
            <div
              role="status"
              className={`rounded-lg border p-3 text-sm ${
                stripeStatus.ok
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {stripeStatus.msg}
            </div>
          )}


          {/* Stripe Connect — PSP definitivo, onboarding EM CONSTRUÇÃO (ADR-028).
              Só aparece com a flag ativa; ainda não conecta a nenhum checkout real. */}
          {stripeConnectActive && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <h2 className="font-semibold text-foreground">Receber pela Stripe</h2>
              {account?.stripeAccountId ? (
                stripeReady ? (
                  <div className="space-y-2">
                    <p className="inline-flex items-center gap-2 text-sm text-success">
                      <span aria-hidden="true">✅</span>
                      Conta verificada e pronta para receber.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Os repasses das suas locações cairão automaticamente na conta bancária
                      cadastrada, já com a taxa ShareO de {feeLabel} descontada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <span aria-hidden="true">⏳</span>
                      Cadastro iniciado, verificação da Stripe pendente.
                    </p>
                    <a
                      href="/api/payments/stripe/connect"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline"
                    >
                      Continuar cadastro
                    </a>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Cadastre seus dados bancários pela Stripe para receber os repasses
                    automaticamente, sem espera pelo repasse manual.
                  </p>
                  <a
                    href="/api/payments/stripe/connect"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Cadastrar dados bancários
                  </a>
                </div>
              )}
            </div>
          )}

          {/* PIX — caminho MANUAL de repasse. Não é código morto: o
              cron/payout só usa a Stripe quando `stripeConnectStatus === "ACTIVE"`;
              fora disso cai aqui e um ADMIN_FINANCEIRO paga à mão. Apagar este
              formulário deixaria sem receber quem não conectou a Stripe. */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-foreground">
                {stripeReady ? "Chave PIX (reserva)" : "Receber por PIX"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {stripeReady
                  ? "Sua conta Stripe está ativa, então o repasse sai automaticamente. A chave PIX fica só como reserva."
                  : "Alternativa enquanto a Stripe não estiver ativa. Por aqui o repasse NÃO é automático: a equipe ShareO executa o PIX manualmente, após verificar a chave em até 1 dia útil."}
              </p>
            </div>
            <PixAccountForm existing={account} />
          </div>

          {/* Mercado Pago — Modelo B / split (dormente desde ADR-028, só aparece com a flag ativa). */}
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
              { icon: "⏳", title: "Janela de retenção", desc: `O valor fica retido por ${payoutLabel} após a devolução — janela que cobre o prazo de abertura de disputa.` },
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
