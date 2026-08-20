/**
 * POST /api/webhooks/stripe-connect
 * Webhook de Event Destinations v2 (ADR-028, pendência "Webhooks de Connect").
 *
 * Contas Stripe Connect Accounts v2 (lib/stripe-connect.ts) NÃO disparam o
 * webhook clássico `account.updated` (v1) — usam um mecanismo de assinatura
 * diferente: Event Destinations, entregando eventos "thin" (payload mínimo,
 * só o tipo + id do objeto relacionado).
 *
 * Rota SEPARADA do webhook v1 de propósito: a verificação de assinatura é
 * outra função (`stripe.parseEventNotification`, não `webhooks.constructEvent`
 * — que recusa explicitamente payload de evento thin) e usa outro secret
 * (`STRIPE_CONNECT_WEBHOOK_SECRET`, gerado na criação do Event Destination —
 * ver scripts/create-stripe-connect-event-destination.ts). Escolher entre as
 * duas exigiria olhar o payload ANTES de verificar a assinatura, o que não se
 * faz — daí o endpoint próprio.
 *
 * Sem esta rota, a sincronização de status (stripeConnectStatus/
 * stripeChargesEnabled/etc, ver syncStripeConnectAccount) depende só do
 * retorno do onboarding — não captura mudanças que aconteçam fora de uma
 * visita do proprietário à tela (ex.: a Stripe suspender a conta depois).
 */
import type { Stripe } from "stripe"
import { getStripe } from "@/lib/stripe"
import { verifyStripeWebhookRequest } from "@/lib/payments/stripe-webhook"
import { fetchAndSyncConnectAccount } from "@/lib/stripe-connect"
import { withStripeEventQueue } from "@/lib/payments/stripe-event-queue"

const LOG = "[stripe-connect webhook]"

export async function POST(req: Request) {
  const stripe = getStripe()

  const verified = await verifyStripeWebhookRequest<Stripe.V2.Core.EventNotification>(req, {
    logPrefix:    LOG,
    secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
    verify:       (body, signature, secret) => stripe.parseEventNotification(body, signature, secret),
  })
  if (!verified.ok) return verified.response
  const notification = verified.payload

  // Mesma fila/dedup do webhook v1 — o id de evento thin não colide com o de
  // eventos v1 (namespaces diferentes).
  return withStripeEventQueue(
    { id: notification.id, type: notification.type, payload: notification },
    LOG,
    async () => {
      switch (notification.type) {
        case "v2.core.account[configuration.recipient].capability_status_updated":
        case "v2.core.account[requirements].updated": {
          const accountId = notification.related_object?.id
          if (!accountId) break

          const account = await fetchAndSyncConnectAccount(accountId)
          console.warn(`${LOG} ${notification.type} → conta ${account.id} sincronizada`)
          break
        }

        case "v2.core.event_destination.ping": {
          // Ping disparado pela Stripe ao criar/testar o Event Destination —
          // só confirma que o endpoint está de pé e a assinatura confere.
          console.warn(`${LOG} ping recebido`)
          break
        }

        default:
          // Ignora eventos não assinados/tratados
          break
      }
    },
  )
}
