/**
 * Notificações para mudança de status da connected account do proprietário.
 *
 * Disparadas pelo webhook de Connect (app/api/webhooks/stripe-connect/route.ts)
 * após uma mudança de status confirmada (requirement vencido, capability
 * suspensa ou encerrada). Depende de STRIPE-01 estar resolvido para receber
 * os eventos.
 *
 * Idempotência:
 *   O webhook já deduplica por event ID via StripeEventQueue (ver
 *   lib/payments/stripe-event-queue.ts) — o mesmo evento nunca entra duas
 *   vezes no handler. Além disso, só notificamos quando o status
 *   REALMENTE muda (prevStatus !== newStatus), então dois eventos diferentes
 *   que cheguem com o status já no mesmo valor não geram notificação dupla.
 *
 * PII:
 *   Nunca logar nome, e-mail, CPF ou accountId em conjunto. O log usa só o
 *   userId e o status — o suficiente para diagnóstico sem expor PII.
 */
import { StripeConnectStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendStripeConnectNeedsActionEmail } from "@/lib/email"

const LOG = "[stripe-connect-notify]"

/**
 * Status que significam "o proprietário precisa agir ou perdeu capacidade de
 * receber". ONBOARDING e NOT_CONNECTED são excluídos: nesses casos o
 * proprietário ainda não ativou a conta ou está no meio do processo — não é
 * uma degradação inesperada.
 */
const STATUS_NEEDS_ACTION = new Set<StripeConnectStatus>([
  StripeConnectStatus.RESTRICTED,
  StripeConnectStatus.REJECTED,
])

/**
 * Notifica o proprietário caso a mudança de status da conta Stripe exija
 * ação dele (RESTRICTED ou REJECTED), e somente se o status de fato mudou.
 *
 * @param stripeAccountId - "acct_..." da connected account
 * @param newStatus       - status derivado depois do sync
 * @param prevStatus      - status anterior ao sync (de syncStripeConnectAccount);
 *                          null significa que a conta não existia no banco ainda
 *
 * Não lança: falhas de notificação não devem reverter o processamento do
 * evento. O erro é logado para diagnóstico.
 */
export async function notifyConnectStatusIfNeeded(
  stripeAccountId: string,
  newStatus:        StripeConnectStatus,
  prevStatus:       StripeConnectStatus | null,
): Promise<void> {
  if (!STATUS_NEEDS_ACTION.has(newStatus)) return

  // Só notifica na TRANSIÇÃO de status. prevStatus === null significa que
  // a conta estava sendo criada — não é uma degradação inesperada.
  if (prevStatus === null || prevStatus === newStatus) return

  // Uma única query — o usuario está na relação direta com ownerPaymentAccount.
  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { stripeAccountId },
    select: { user: { select: { id: true, name: true, email: true } } },
  })

  const user = account?.user
  if (!user) return

  const isRejected = newStatus === StripeConnectStatus.REJECTED

  const reason: "restricted" | "rejected" = isRejected ? "rejected" : "restricted"

  const [title, body] = isRejected
    ? [
        "Conta de recebimento encerrada",
        "A Stripe encerrou sua conta de recebimento. Para continuar anunciando, acesse a tela de recebimentos.",
      ]
    : [
        "Ação necessária na conta de recebimento",
        "Há pendências na sua conta Stripe que precisam ser resolvidas para manter os repasses ativos. Acesse a tela de recebimentos.",
      ]

  // Notificação in-app e e-mail são independentes — disparados em paralelo.
  // getResend() (dentro de sendStripeConnectNeedsActionEmail) filtra domínios de teste.
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: user.id,
        type:   "STRIPE_CONNECT_NEEDS_ACTION",
        title,
        body,
        data:   { link: "/perfil/recebimentos" },
      },
    }),
    sendStripeConnectNeedsActionEmail(user.email, user.name ?? "", reason)
      .catch((err: unknown) => {
        // Falha de e-mail não reverte a notificação in-app — logar sem PII.
        console.error(`${LOG} email userId=${user.id} status=${newStatus} falhou:`, err instanceof Error ? err.message : err)
      }),
  ])

  console.warn(`${LOG} userId=${user.id} ${prevStatus} → ${newStatus}: notificado`)
}
