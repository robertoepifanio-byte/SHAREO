/**
 * Mercado Pago — integração da Fase 2 (Modelo B / split via OAuth).
 *
 * Gating em dois níveis (ambos precisam ser verdadeiros para o MP atuar):
 *   1. Flag de negócio  → `getMercadoPagoConfig().enabled` (PlatformConfig, default OFF)
 *   2. Credenciais      → `isMercadoPagoConfigured()` (env vars presentes)
 *
 * Com a flag OFF, nada aqui é alcançado pelo checkout — o fluxo atual (PIX manual /
 * Stripe oculto) não muda. As rotas de OAuth/checkout/webhook do MP só agem após
 * `assertMercadoPagoActive()` passar.
 *
 * Decisão: ADR-026 (supersede ADR-012). Nada vai a produção antes do D4 (parecer FORMAL).
 * Como obter as credenciais: docs/mercadopago-procedimentos-fundadores.md
 */
import { MercadoPagoConfig, OAuth, Preference, Payment } from "mercadopago"
import { APP_URL } from "@/lib/app-url"
import { getMercadoPagoConfig } from "@/lib/platform-config"

/** Credenciais do Mercado Pago lidas do ambiente (server-side). */
export interface MercadoPagoCredentials {
  clientId:     string // MP_CLIENT_ID — OAuth (identifica a aplicação)
  clientSecret: string // MP_CLIENT_SECRET — OAuth (troca code → access_token do locador)
  accessToken:  string // MP_ACCESS_TOKEN — token da aplicação (sandbox: TEST-...)
}

/** URLs que a aplicação MP precisa ter registradas no painel (OAuth + webhook). */
export const MP_OAUTH_CALLBACK_PATH = "/api/mp/oauth/callback"
export const MP_WEBHOOK_PATH        = "/api/mp/webhook"

/** Redirect URI absoluto do OAuth — precisa bater EXATAMENTE com o registrado no painel MP. */
export function getOAuthRedirectUri(): string {
  return `${APP_URL}${MP_OAUTH_CALLBACK_PATH}`
}

/**
 * true se as credenciais mínimas estão presentes no ambiente.
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

/** Public Key (cliente/Bricks) — opcional, usada só no checkout. */
export function getMercadoPagoPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || null
}

/**
 * Gate único do caminho Mercado Pago: flag de negócio (PlatformConfig, default OFF)
 * E credenciais presentes. Com qualquer um falso, o MP NÃO atua e o fluxo atual
 * (PIX manual / Stripe) permanece. Usar no topo de toda rota MP (connect/callback/
 * checkout/webhook) e para decidir renderizar a UI de "Conectar Mercado Pago".
 */
export async function isMercadoPagoActive(): Promise<boolean> {
  if (!isMercadoPagoConfigured()) return false
  const { enabled } = await getMercadoPagoConfig()
  return enabled
}

// ─── Cliente do SDK ──────────────────────────────────────────────────────────

/**
 * Inicializa um cliente do SDK do Mercado Pago.
 *
 * @param accessToken Token a usar. Default = token da APLICAÇÃO/plataforma
 *   (`MP_ACCESS_TOKEN`). Para criar pagamentos em nome de um locador (split),
 *   passe o `access_token` daquele vendedor obtido via OAuth.
 *
 * Lança em runtime se o token da aplicação faltar (mesmo padrão lazy do Stripe).
 */
export function getMercadoPagoClient(accessToken?: string): MercadoPagoConfig {
  const token = accessToken ?? process.env.MP_ACCESS_TOKEN
  if (!token) {
    throw new Error("Mercado Pago não configurado: defina MP_ACCESS_TOKEN.")
  }
  return new MercadoPagoConfig({ accessToken: token })
}

/** Cliente de Preference (Checkout Pro) em nome de um vendedor (token do locador). */
export function getPreferenceClient(sellerAccessToken: string): Preference {
  return new Preference(getMercadoPagoClient(sellerAccessToken))
}

/** Cliente de Payment — consulta de status no webhook (token da aplicação). */
export function getPaymentClient(accessToken?: string): Payment {
  return new Payment(getMercadoPagoClient(accessToken))
}

// ─── OAuth (onboarding do locador — Modelo B) ────────────────────────────────

/**
 * Monta a URL de autorização para a qual o locador é redirecionado.
 * `state` é um valor opaco anti-CSRF (devolvido inalterado no callback).
 */
export function buildOAuthAuthorizeUrl(state: string): string {
  const { clientId } = getMercadoPagoCredentials()
  const oauth = new OAuth(getMercadoPagoClient())
  return oauth.getAuthorizationURL({
    options: {
      client_id:    clientId,
      state,
      redirect_uri: getOAuthRedirectUri(),
    },
  })
}

/** Resultado da troca do code OAuth pelos tokens do vendedor. */
export interface MercadoPagoSellerTokens {
  accessToken:  string
  refreshToken: string
  publicKey:    string | null
  mpUserId:     string  // user_id do MP (numérico) — armazenado como string
  expiresAt:    Date    // now + expires_in
  liveMode:     boolean
}

/**
 * Troca o `code` recebido no callback pelos tokens do vendedor (locador).
 * Usa o Client Secret da aplicação. Lança se o MP não retornar os campos mínimos.
 */
export async function exchangeOAuthCode(code: string): Promise<MercadoPagoSellerTokens> {
  const { clientId, clientSecret } = getMercadoPagoCredentials()
  const oauth = new OAuth(getMercadoPagoClient())
  const res = await oauth.create({
    body: {
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      redirect_uri:  getOAuthRedirectUri(),
    },
  })

  if (!res.access_token || !res.refresh_token || res.user_id == null) {
    throw new Error("Resposta de OAuth do Mercado Pago incompleta (tokens ausentes).")
  }

  return {
    accessToken:  res.access_token,
    refreshToken: res.refresh_token,
    publicKey:    res.public_key ?? null,
    mpUserId:     String(res.user_id),
    expiresAt:    new Date(Date.now() + (res.expires_in ?? 0) * 1000),
    liveMode:     Boolean(res.live_mode),
  }
}

/**
 * Renova o access_token de um vendedor a partir do refresh_token.
 * Os access tokens do MP expiram (~180 dias); chamar antes de criar pagamentos.
 */
export async function refreshSellerToken(refreshToken: string): Promise<MercadoPagoSellerTokens> {
  const { clientId, clientSecret } = getMercadoPagoCredentials()
  const oauth = new OAuth(getMercadoPagoClient())
  const res = await oauth.refresh({
    body: {
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
  })

  if (!res.access_token || !res.refresh_token || res.user_id == null) {
    throw new Error("Refresh de OAuth do Mercado Pago incompleto (tokens ausentes).")
  }

  return {
    accessToken:  res.access_token,
    refreshToken: res.refresh_token,
    publicKey:    res.public_key ?? null,
    mpUserId:     String(res.user_id),
    expiresAt:    new Date(Date.now() + (res.expires_in ?? 0) * 1000),
    liveMode:     Boolean(res.live_mode),
  }
}
