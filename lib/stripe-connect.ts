/**
 * Stripe Connect — onboarding do proprietário (PSP definitivo, ADR-028).
 *
 * EM CONSTRUÇÃO: só onboarding (criação de connected account + coleta de
 * dados bancários/KYC via Stripe). Ainda NÃO inclui split no checkout —
 * isso é a próxima fase (ver docs/adr/ADR-028-reversao-stripe-connect.md,
 * "Notas de implementação").
 *
 * Modelo escolhido: Connect EXPRESS — a Stripe hospeda a tela de onboarding
 * (identidade + dados bancários), o proprietário nunca preenche formulário
 * nosso para isso. Custom (onboarding 100% construído por nós) foi avaliado
 * e descartado por ora: mais tempo de engenharia e mais responsabilidade de
 * compliance do lado da ShareO — ver decisão registrada na conversa/memória
 * do projeto. Pode ser revisitado se a marca Stripe visível no onboarding
 * virar objeção real dos proprietários.
 *
 * Gating em dois níveis (mesmo padrão de lib/mercadopago.ts):
 *   1. Flag de negócio → getStripeConnectConfig().enabled (PlatformConfig, default OFF)
 *   2. Credenciais     → STRIPE_SECRET_KEY presente (checado por getStripe())
 *
 * Pré-requisito FORA do código: a conta Stripe da plataforma precisa ter o
 * perfil de Connect ativado no Dashboard (Settings → Connect) antes de criar
 * a primeira connected account — sem isso, `accounts.create` retorna erro.
 */
import type { Stripe as StripeType } from "stripe"
import { StripeConnectStatus, type Prisma } from "@prisma/client"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { getStripeConnectConfig } from "@/lib/platform-config"

export const STRIPE_CONNECT_RETURN_PATH  = "/api/stripe/connect/return"
export const STRIPE_CONNECT_REFRESH_PATH = "/api/stripe/connect/refresh"

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
 * Cria a connected account (Express) do proprietário se ele ainda não tiver
 * uma, ou retorna o `stripeAccountId` já existente. Não faz onboarding —
 * só garante que a conta existe no lado Stripe antes de gerar o link.
 */
export async function getOrCreateConnectedAccount(userId: string): Promise<string> {
  const existing = await prisma.ownerPaymentAccount.findUnique({
    where:  { userId },
    select: { stripeAccountId: true },
  })
  if (existing?.stripeAccountId) return existing.stripeAccountId

  const stripe = getStripe()
  const account = await stripe.accounts.create({
    type:    "express",
    country: "BR",
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  })

  await prisma.ownerPaymentAccount.upsert({
    where:  { userId },
    update: { stripeAccountId: account.id },
    create: { userId, stripeAccountId: account.id },
  })

  return account.id
}

/** Gera o link de onboarding hospedado pela Stripe para uma connected account. */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const stripe = getStripe()
  const link = await stripe.accountLinks.create({
    account:    accountId,
    type:       "account_onboarding",
    refresh_url: `${APP_URL}${STRIPE_CONNECT_REFRESH_PATH}`,
    return_url:  `${APP_URL}${STRIPE_CONNECT_RETURN_PATH}`,
  })
  return link.url
}

/**
 * Deriva o status resumido (enum) a partir do objeto Account bruto da Stripe.
 * Ponto ÚNICO de derivação — usado tanto no retorno do onboarding quanto no
 * webhook `account.updated`, para os 4 campos booleanos/string e o enum
 * nunca serem gravados a partir de lugares diferentes (evita os dois
 * ficarem dessincronizados).
 */
export function deriveStripeConnectStatus(account: StripeType.Account): StripeConnectStatus {
  const disabledReason = account.requirements?.disabled_reason ?? null
  if (disabledReason?.startsWith("rejected.")) return StripeConnectStatus.REJECTED
  if (account.charges_enabled && account.payouts_enabled) return StripeConnectStatus.ACTIVE
  if (disabledReason) return StripeConnectStatus.RESTRICTED
  return StripeConnectStatus.ONBOARDING
}

/**
 * Sincroniza os campos stripe* de OwnerPaymentAccount a partir de um objeto
 * Account fresco (vindo de `accounts.retrieve` no retorno do onboarding, ou
 * do payload do webhook `account.updated`). Único ponto de escrita desses
 * campos — sempre os 5 juntos, nunca um de cada vez.
 */
export async function syncStripeConnectAccount(account: StripeType.Account): Promise<void> {
  const status = deriveStripeConnectStatus(account)
  const disabledReason = account.requirements?.disabled_reason ?? null

  const existing = await prisma.ownerPaymentAccount.findUnique({
    where:  { stripeAccountId: account.id },
    select: { stripeConnectStatus: true, stripeConnectedAt: true },
  })
  if (!existing) {
    // account.updated pode chegar antes do upsert em getOrCreateConnectedAccount
    // concluir (corrida rara); nada a sincronizar ainda, o próximo evento cobre.
    console.warn(`[stripe-connect] account.updated para ${account.id} sem OwnerPaymentAccount correspondente`)
    return
  }

  const data: Prisma.OwnerPaymentAccountUpdateInput = {
    stripeConnectStatus:    status,
    stripeChargesEnabled:   account.charges_enabled,
    stripePayoutsEnabled:   account.payouts_enabled,
    stripeDetailsSubmitted: account.details_submitted,
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
