/**
 * Guardas de QUALQUER cobrança real ao locatário (go-live 01/10/2026).
 *
 * Antes disto só `getStripe()` decidia: gravar `sk_live_` no Vercel abria cobrança
 * a qualquer reserva confirmada (`stripeConnectEnabled` governa só o onboarding do
 * proprietário) e o dono sem como receber não era barrado.
 *
 * Duas perguntas, nesta ordem, antes de criar sessão de pagamento:
 *
 *   1. A cobrança real está aberta?      → senão `BILLING_CLOSED` (403)
 *   2. O proprietário tem como receber?  → senão `OWNER_NOT_READY` (409)
 *
 * Pontos que criam cobrança e por isso chamam isto (levantados por Grep de
 * `checkout.sessions.create` — se aparecer um quarto, é aqui que ele se pluga):
 *   - app/api/payments/checkout   (locação)               → as duas guardas
 *   - app/api/payments/extension  (diárias extras)        → as duas guardas
 *   - lib/lateFee.ts              (taxa de atraso)        → só a 1ª, via isBillingOpen() (ver lá o porquê)
 * Um teste (charge-guards-cobertura.test.ts) varre app/ e lib/ e reprova se surgir
 * um `checkout.sessions.create` fora desta lista ou sem importar este arquivo.
 *
 * Webhooks e reembolso NÃO passam por aqui: cobrança que já aconteceu tem que
 * ser processada e devolvida mesmo com o interruptor fechado.
 *
 * NÃO importar `next/server` aqui: lib/lateFee.ts chega a testes em jsdom, onde
 * o global `Request` não existe (mesma restrição de lib/stripe.ts). Por isso as
 * guardas devolvem um descritor, e cada rota monta o seu NextResponse.
 */
import { prisma } from "@/lib/prisma"
import { getBillingConfig } from "@/lib/platform-config"

export type ChargeBlock = {
  code:    "BILLING_CLOSED" | "OWNER_NOT_READY"
  status:  403 | 409
  message: string
}

// Descritores são dados imutáveis (cada rota monta o seu NextResponse a partir
// deles), então dá para devolver a constante direto.
const BILLING_CLOSED: ChargeBlock = Object.freeze({
  code:    "BILLING_CLOSED",
  status:  403,
  message: "Os pagamentos ainda não estão abertos. Nenhuma cobrança foi feita — tente novamente mais tarde.",
})

const OWNER_NOT_READY: ChargeBlock = Object.freeze({
  code:    "OWNER_NOT_READY",
  status:  409,
  message: "O proprietário ainda não configurou o recebimento, então o pagamento não pode ser feito agora. " +
           "Nenhuma cobrança foi feita — tente novamente mais tarde ou fale com o proprietário.",
})

/**
 * A chave Stripe é de TESTE? Cobrança em modo teste não move dinheiro, então não
 * precisa de interruptor — e o staging inteiro depende disso.
 *
 * `rk_test_` (restrita de teste) entra junto: também é modo teste. Qualquer outra
 * coisa, inclusive chave ausente ou com formato desconhecido, conta como REAL —
 * na dúvida, fechado.
 */
export function isStripeTestMode(): boolean {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim()
  return key.startsWith("sk_test_") || key.startsWith("rk_test_")
}

/**
 * Cobrança aberta? Chave de teste: sempre. Chave live: só com
 * `PlatformConfig.billingEnabled = "true"` — ausente ou banco fora do ar = fechada.
 */
export async function isBillingOpen(): Promise<boolean> {
  if (isStripeTestMode()) return true
  return (await getBillingConfig()).enabled
}

/**
 * A conta do proprietário tem Connect ATIVO? É a condição que o cron de repasse
 * (app/api/cron/payout) usa para criar o Transfer sozinho, e a guarda abaixo a
 * reaproveita: as duas tinham que ser a MESMA pergunta, senão o checkout cobraria
 * de quem o cron não sabe repassar. Se um dia o cron exigir mais (ex.:
 * `stripePayoutsEnabled`), é aqui que muda, e as duas mudam juntas.
 */
export function hasActiveConnect<T extends { stripeAccountId: string | null; stripeConnectStatus: string | null }>(
  account: T,
): account is T & { stripeAccountId: string } {
  return Boolean(account.stripeAccountId) && account.stripeConnectStatus === "ACTIVE"
}

/**
 * O proprietário tem ALGUM caminho de repasse?
 *
 * Espelha o que o cron de repasse (app/api/cron/payout) e o admin de repasses
 * realmente sabem executar:
 *   - Connect ACTIVE: o cron cria o Transfer sozinho;
 *   - chave PIX cadastrada: o cron deixa o Payout em PROCESSING e o
 *     ADMIN_FINANCEIRO paga na mão (/admin/financeiro). Uma conta REJECTED não
 *     conta — o admin recusou aquela chave. PENDING_VERIFICATION conta: o admin
 *     paga com a chave à vista e não exige a verificação para isso.
 *
 * Sem nenhum dos dois o dinheiro entra e o repasse não nasce
 * (`SEM_CONTA_DE_RECEBIMENTO` em lib/payout.ts só faz console.warn).
 */
export async function ownerHasPayoutPath(ownerId: string): Promise<boolean> {
  const account = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId: ownerId },
    select: { pixKey: true, status: true, stripeAccountId: true, stripeConnectStatus: true },
  })
  if (!account) return false

  if (hasActiveConnect(account)) return true

  return Boolean(account.pixKey?.trim()) && account.status !== "REJECTED"
}

/**
 * As duas guardas, na ordem. `null` = pode cobrar.
 *
 * A ordem importa: com a cobrança fechada, o locatário não precisa saber (nem
 * o servidor gastar uma consulta) se o proprietário está pronto.
 */
export async function checkChargeGuards(ownerId: string): Promise<ChargeBlock | null> {
  if (!(await isBillingOpen())) return BILLING_CLOSED

  if (!(await ownerHasPayoutPath(ownerId))) return OWNER_NOT_READY

  return null
}
