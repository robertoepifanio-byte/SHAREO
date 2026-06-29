/**
 * Mercado Pago — scaffolding da Fase 1 (Modelo B / split via OAuth).
 *
 * ⚠️ ESTE MÓDULO É INERTE POR ENQUANTO.
 * Ele só LÊ a configuração (variáveis de ambiente) e expõe guards. Não cria
 * pagamentos, não chama o SDK e não é importado por nenhuma rota de checkout —
 * portanto NÃO altera o fluxo de pagamento atual (PIX manual / Stripe oculto).
 *
 * Gating em dois níveis (ambos precisam estar verdadeiros para o MP atuar):
 *   1. Flag de negócio  → `getMercadoPagoConfig().enabled` (PlatformConfig, default OFF)
 *   2. Credenciais      → `isMercadoPagoConfigured()` (env vars presentes)
 *
 * Decisão: ADR-026 (supersede ADR-012). Nada vai a produção antes do D4 (parecer FORMAL).
 * Como obter as credenciais: docs/mercadopago-procedimentos-fundadores.md
 *
 * 🔜 Fase 2 preencherá aqui: cliente do SDK (`mercadopago` v2), criação de
 *    Preference/Payment com `marketplace_fee` (nossos 15%) e a troca do code OAuth
 *    pelo access_token do locador. Hoje, nenhum desses passos existe.
 */

/** Credenciais do Mercado Pago lidas do ambiente (server-side). */
export interface MercadoPagoCredentials {
  clientId:     string // MP_CLIENT_ID — OAuth (identifica a aplicação)
  clientSecret: string // MP_CLIENT_SECRET — OAuth (troca code → access_token do locador)
  accessToken:  string // MP_ACCESS_TOKEN — token da aplicação (sandbox: TEST-...)
}

/** URLs que a aplicação MP precisa ter registradas no painel (OAuth + webhook). */
export const MP_OAUTH_CALLBACK_PATH = "/api/mp/oauth/callback"
export const MP_WEBHOOK_PATH        = "/api/mp/webhook"

/**
 * true se as credenciais mínimas da Fase 1 estão presentes no ambiente.
 * Não lança — serve para decidir, junto com a flag, se o caminho MP está disponível.
 */
export function isMercadoPagoConfigured(): boolean {
  return Boolean(
    process.env.MP_CLIENT_ID &&
    process.env.MP_CLIENT_SECRET &&
    process.env.MP_ACCESS_TOKEN,
  )
}

/**
 * Retorna as credenciais do MP a partir do ambiente.
 * Lança APENAS em runtime (não em build-time) se algo faltar — mesmo padrão de
 * lib/stripe.ts. Só deve ser chamado depois de confirmar `isMercadoPagoConfigured()`.
 */
export function getMercadoPagoCredentials(): MercadoPagoCredentials {
  const clientId     = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  const accessToken  = process.env.MP_ACCESS_TOKEN

  if (!clientId || !clientSecret || !accessToken) {
    throw new Error(
      "Mercado Pago não configurado: defina MP_CLIENT_ID, MP_CLIENT_SECRET e MP_ACCESS_TOKEN.",
    )
  }

  return { clientId, clientSecret, accessToken }
}

/** Public Key (cliente/Bricks) — opcional, usada só na Fase 2. */
export function getMercadoPagoPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || null
}
