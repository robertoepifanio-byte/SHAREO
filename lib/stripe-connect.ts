/**
 * Stripe Connect — onboarding do proprietário (PSP definitivo, ADR-028).
 *
 * EM CONSTRUÇÃO: só onboarding (criação de connected account + coleta de
 * dados bancários/KYC via Stripe). Ainda NÃO inclui split no checkout —
 * isso é a próxima fase (ver docs/adr/ADR-028-reversao-stripe-connect.md,
 * "Notas de implementação").
 *
 * API: Accounts v2 (`stripe.v2.core.accounts`/`accountLinks`), não v1. A
 * primeira tentativa usou v1 (`stripe.accounts.create`) e a Stripe recusou —
 * contas novas nascem exigindo v2 ("Stripe no longer recommends Accounts v1
 * for new Connect integrations"). v1 continua existindo como modo de
 * compatibilidade habilitável no Dashboard, mas não é o caminho recomendado
 * pra uma integração nova — por isso migramos, em vez de só religar o v1.
 *
 * Configuration escolhida: **recipient**, não **merchant**. O desenho do
 * ADR-028 é destination charge sem `on_behalf_of` (a ShareO processa a
 * cobrança do locatário, cartão/Pix/boleto; o proprietário só RECEBE a parte
 * dele via transfer) — a doc da Stripe é explícita que esse é exatamente o
 * caso de uso do `recipient` ("Utilize this configuration if the Account
 * will not be the Merchant of Record, like with ... Destination Charges
 * without on_behalf_of set"). `merchant` seria o caso errado (conta
 * processando a própria cobrança) — não é o nosso modelo.
 *
 * Modelo escolhido: Connect EXPRESS (`dashboard: "express"`) — a Stripe
 * hospeda a tela de onboarding (identidade + dados bancários), o
 * proprietário nunca preenche formulário nosso pra isso. Custom (onboarding
 * 100% construído por nós) foi avaliado e descartado por ora: mais tempo de
 * engenharia e mais responsabilidade de compliance do lado da ShareO — ver
 * decisão registrada na conversa/memória do projeto. Pode ser revisitado se
 * a marca Stripe visível no onboarding virar objeção real dos proprietários.
 *
 * Gating em dois níveis (mesmo padrão de lib/mercadopago.ts):
 *   1. Flag de negócio → getStripeConnectConfig().enabled (PlatformConfig, default OFF)
 *   2. Credenciais     → STRIPE_SECRET_KEY presente (checado por getStripe())
 *
 * Pré-requisito FORA do código: a conta Stripe da plataforma precisa ter o
 * perfil de Connect ativado no Dashboard (Settings → Connect) antes de criar
 * a primeira connected account — sem isso, `accounts.create` retorna erro.
 *
 * Webhook: `account.updated` (v1) NÃO dispara para contas v2 — o handler em
 * app/api/webhooks/stripe/route.ts fica como caminho morto/futuro até
 * configurarmos Event Destinations v2 (mecanismo de assinatura diferente,
 * eventos "thin" via `stripe.v2.core.events`). Por isso a sincronização de
 * status HOJE depende inteiramente do retorno do onboarding
 * (app/api/stripe/connect/return/route.ts), não do webhook.
 */
import type { Stripe as StripeNS } from "stripe"
import { StripeConnectStatus, type Prisma } from "@prisma/client"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { getStripeConnectConfig } from "@/lib/platform-config"

export const STRIPE_CONNECT_RETURN_PATH  = "/api/stripe/connect/return"
export const STRIPE_CONNECT_REFRESH_PATH = "/api/stripe/connect/refresh"

/** Alias curto pro tipo de Account da API v2 (não confundir com Stripe.Account, que é v1). */
export type StripeConnectAccount = StripeNS.V2.Core.Account

/**
 * Gate único do caminho Stripe Connect: flag de negócio (default OFF) E
 * credenciais Stripe presentes. Usar no topo de toda rota de onboarding e
 * para decidir renderizar a UI de "Conectar recebimento".
 */
export async function isStripeConnectActive(): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false
  const { enabled } = await getStripeConnectConfig()
  return enabled
}

/**
 * Cria a connected account (Accounts v2, configuration `recipient`,
 * dashboard `express`) do proprietário se ele ainda não tiver uma, ou
 * retorna o `stripeAccountId` já existente. Não faz onboarding — só garante
 * que a conta existe no lado Stripe antes de gerar o link.
 */
export async function getOrCreateConnectedAccount(userId: string): Promise<string> {
  const existing = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId },
    select: { stripeAccountId: true },
  })
  if (existing?.stripeAccountId) return existing.stripeAccountId

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })

  const stripe = getStripe()
  const account = await stripe.v2.core.accounts.create({
    contact_email: user?.email ?? undefined,
    display_name:  user?.name ?? undefined,
    dashboard:     "express",
    identity: {
      country:     "BR",
      entity_type: "individual",
    },
    configuration: {
      // A Stripe recusa stripe_transfers sem card_payments requisitado
      // junto ("cannot be requested without configuration.merchant.
      // capabilities.card_payments") — mesmo a conta não sendo merchant of
      // record no nosso desenho (não usamos on_behalf_of). Requisitamos os
      // dois porque a API exige, não porque mudamos o modelo de cobrança.
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    defaults: {
      currency: "brl",
      locales:  ["pt-BR"],
      responsibilities: {
        // application_express: a ShareO (plataforma) recolhe as tarifas da Stripe,
        // não o proprietário — bate com "sem taxa surpresa" pro locador.
        fees_collector:   "application_express",
        // application: a ShareO é responsável por perdas/estornos, não o
        // proprietário — ele só recebe a parte líquida do repasse.
        losses_collector: "application",
      },
    },
  })

  await prisma.ownerPaymentAccount.upsert({
    where:  { userId },
    update: { stripeAccountId: account.id },
    create: { userId, stripeAccountId: account.id },
  })

  return account.id
}

/**
 * Gera o link de onboarding hospedado pela Stripe (Accounts v2 Account Link)
 * para uma connected account.
 *
 * `return_url`/`refresh_url` da Stripe precisam ser `https://` (não aceitam
 * scheme customizado tipo `shareo://`) — por isso o destino final por
 * plataforma (web navega no próprio site; mobile volta por deep-link) é
 * decidido DEPOIS, pelas rotas /return e /refresh, usando o `client` que
 * viaja aqui como query param. O `accountId` também viaja na URL: as rotas
 * de retorno não dependem de sessão (o navegador externo do onboarding no
 * mobile não carrega nem cookie nem Bearer token do app) — identificam a
 * conta só pelo `stripeAccountId`.
 */
export async function createOnboardingLink(accountId: string, client: "web" | "mobile" = "web"): Promise<string> {
  const stripe = getStripe()
  const qs = `account=${accountId}&client=${client}`
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        // Os dois — a conta tem as duas configurations aplicadas (ver
        // getOrCreateConnectedAccount) porque a Stripe exige card_payments
        // junto de stripe_transfers; sem listar "merchant" aqui também, o
        // onboarding hospedado não coletaria os requirements dela e a
        // capability ficaria pendente pra sempre.
        configurations: ["recipient", "merchant"],
        refresh_url: `${APP_URL}${STRIPE_CONNECT_REFRESH_PATH}?${qs}`,
        return_url:  `${APP_URL}${STRIPE_CONNECT_RETURN_PATH}?${qs}`,
      },
    },
  })
  return link.url
}

/** Redireciona pro destino certo por plataforma após return/refresh (ver createOnboardingLink). */
export function stripeConnectFinalRedirect(client: string | null, status: string): string {
  return client === "mobile"
    ? `shareo://perfil/recebimentos?stripe=${status}`
    : `${APP_URL}/perfil/recebimentos?stripe=${status}`
}

/**
 * Deriva o status resumido (enum) a partir do objeto Account v2 da Stripe.
 * Ponto ÚNICO de derivação — usado no retorno do onboarding (e, quando
 * Event Destinations v2 forem configuradas, também no webhook) — pra os
 * campos booleanos/string e o enum nunca serem gravados a partir de lugares
 * diferentes (evita os dois ficarem dessincronizados).
 *
 * Sem configuration `recipient` na conta ainda: ONBOARDING (não deveria
 * acontecer no fluxo normal, é defensivo). `active` nos dois capabilities
 * (payouts + stripe_transfers) = pronto pra receber. `unsupported` em
 * qualquer um = REJECTED (permanente, ex.: entity_type/país não suportado).
 * `restricted` = RESTRICTED. Qualquer outra combinação (pending, ou um
 * active e outro pending) = ONBOARDING.
 */
export function deriveStripeConnectStatus(account: StripeConnectAccount): StripeConnectStatus {
  const balance   = account.configuration?.recipient?.capabilities?.stripe_balance
  const payouts   = balance?.payouts?.status
  const transfers = balance?.stripe_transfers?.status

  if (payouts === "unsupported" || transfers === "unsupported") return StripeConnectStatus.REJECTED
  if (payouts === "active" && transfers === "active") return StripeConnectStatus.ACTIVE
  if (payouts === "restricted" || transfers === "restricted") return StripeConnectStatus.RESTRICTED
  return StripeConnectStatus.ONBOARDING
}

/**
 * Sincroniza os campos stripe* de OwnerPaymentAccount a partir de um objeto
 * Account v2 fresco (vindo de `accounts.retrieve` no retorno do onboarding).
 * Único ponto de escrita desses campos — sempre juntos, nunca um de cada vez.
 *
 * Mapeamento p/ o schema (desenhado originalmente pensando na v1): a
 * configuration `recipient` não tem um conceito de "charges" separado de
 * "payouts" (isso é papel da configuration `merchant`, que não usamos aqui —
 * ver cabeçalho do arquivo) — os dois campos booleanos do schema
 * (`stripeChargesEnabled`/`stripePayoutsEnabled`) acabam espelhando os dois
 * capabilities que realmente existem no recipient (`stripe_transfers` e
 * `payouts`), não uma distinção charges-vs-payouts de verdade.
 * `stripeDetailsSubmitted` vira "sem nenhuma pendência de requirement".
 */
export async function syncStripeConnectAccount(account: StripeConnectAccount): Promise<void> {
  const status = deriveStripeConnectStatus(account)
  const balance   = account.configuration?.recipient?.capabilities?.stripe_balance
  const transfersActive = balance?.stripe_transfers?.status === "active"
  const payoutsActive   = balance?.payouts?.status === "active"
  const entries = account.requirements?.entries ?? []
  const disabledReason = entries[0]?.description ?? null

  const existing = await prisma.ownerPaymentAccount.findUnique({
    where:  { stripeAccountId: account.id },
    select: { stripeConnectStatus: true, stripeConnectedAt: true },
  })
  if (!existing) {
    // Corrida rara: sync chamado antes do upsert em getOrCreateConnectedAccount
    // terminar. Nada a sincronizar ainda; a próxima chamada (refresh/retorno) cobre.
    console.warn(`[stripe-connect] sync para ${account.id} sem OwnerPaymentAccount correspondente`)
    return
  }

  const data: Prisma.OwnerPaymentAccountUpdateInput = {
    stripeConnectStatus:    status,
    stripeChargesEnabled:   transfersActive,
    stripePayoutsEnabled:   payoutsActive,
    stripeDetailsSubmitted: entries.length === 0,
    stripeDisabledReason:   disabledReason,
  }
  // Só grava a data da 1ª vez que a conta fica ativa — não sobrescreve em updates seguintes.
  if (status === StripeConnectStatus.ACTIVE && existing.stripeConnectStatus !== StripeConnectStatus.ACTIVE) {
    data.stripeConnectedAt = new Date()
  }

  await prisma.ownerPaymentAccount.update({
    where: { stripeAccountId: account.id },
    data,
  })
}
