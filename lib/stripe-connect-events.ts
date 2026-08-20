/**
 * Eventos v2 ("thin") de Connect que a ShareO assina — ADR-028.
 *
 * Módulo-folha de propósito: é importado TANTO pela rota que trata os eventos
 * (app/api/webhooks/stripe-connect/route.ts, via `@/`) QUANTO pelo script que
 * registra o Event Destination na Stripe (scripts/create-stripe-connect-event-
 * destination.ts, por caminho relativo — `scripts/` fica fora do tsconfig da
 * app, então o alias `@/` não resolve lá). Por isso não importa nada: qualquer
 * import de `@/lib/...` aqui quebraria o script.
 *
 * Assinar e tratar a partir da mesma lista evita o modo de falha silencioso de
 * assinar um evento que ninguém trata (ou tratar um que nunca chega).
 *
 * Só os dois eventos que alimentam campos que syncStripeConnectAccount()
 * realmente lê: capabilities (`stripe_balance.payouts`/`stripe_transfers`) e
 * requirements. `[configuration.recipient].updated` foi deliberadamente NÃO
 * assinado — dispara junto dos outros dois para a mesma mudança de conta e só
 * geraria uma segunda ida à API da Stripe pelo mesmo estado.
 */
export const STRIPE_CONNECT_EVENT_TYPES = [
  "v2.core.account[configuration.recipient].capability_status_updated",
  "v2.core.account[requirements].updated",
] as const

/**
 * Campos que `accounts.retrieve` precisa incluir explicitamente para que
 * syncStripeConnectAccount() consiga derivar o status.
 *
 * ARMADILHA: na API v2 esses campos são OPT-IN. Um GET sem `include` (é o que
 * `notification.fetchRelatedObject()` do SDK faz) devolve o Account SEM
 * `configuration.recipient` e SEM `requirements` — e aí
 * deriveStripeConnectStatus() leria capabilities indefinidas, concluiria
 * ONBOARDING e REBAIXARIA uma conta que estava ACTIVE. Por isso o webhook
 * refaz o retrieve com estes includes em vez de usar fetchRelatedObject().
 */
export const STRIPE_CONNECT_ACCOUNT_INCLUDES = [
  "configuration.recipient",
  "requirements",
] as const

/**
 * Caminho da rota que recebe estes eventos. Fica aqui (e não em
 * lib/stripe-connect.ts, que o script não consegue importar) porque quem
 * registra o Event Destination na Stripe é o script: se a rota mudar de
 * lugar e o script continuar apontando pro caminho antigo, o destination
 * passa a bater num 404 e a sincronização morre em silêncio — e consertar
 * exige recriar o destination, o que gera um signing secret novo.
 */
export const STRIPE_CONNECT_WEBHOOK_PATH = "/api/webhooks/stripe-connect"
