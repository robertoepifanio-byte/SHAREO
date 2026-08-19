import { prisma } from "@/lib/prisma"

const DEFAULT_FEE_RATE = 1500 // 15% em basis points

// ─── Cache do PlatformConfig (S14-M-11) ───────────────────────────────────────
// Antes, ~59 call-sites faziam um `prisma.find*` por request no caminho crítico
// (item/booking/webhook/cron). Como esses valores mudam raramente (~1×/mês),
// cacheamos TODAS as chaves em memória por um TTL curto. A rota admin de escrita
// chama `clearPlatformConfigCache()` para invalidar na hora; entre instâncias
// serverless a propagação leva no máximo `CONFIG_TTL_MS`.
const CONFIG_TTL_MS = 60_000
let configCache: { map: Record<string, string>; expires: number } | null = null

async function loadConfig(): Promise<Record<string, string>> {
  if (configCache && configCache.expires > Date.now()) return configCache.map
  const rows = await prisma.platformConfig.findMany()
  const map  = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  configCache = { map, expires: Date.now() + CONFIG_TTL_MS }
  return map
}

/** Invalida o cache em memória — chamada após escrita em /api/admin/platform-config. */
export function clearPlatformConfigCache(): void {
  configCache = null
}

/** parseInt seguro a partir do mapa de config (string|undefined → number|NaN). */
function intFrom(map: Record<string, string>, key: string): number {
  return parseInt(map[key] ?? "", 10)
}

// ─── Política de cancelamento ─────────────────────────────────────────────────

export interface CancellationConfig {
  fullRefundHours:    number // horas antes do início para reembolso total (default 24)
  partialRefundHours: number // horas antes do início para reembolso parcial (default 6)
  partialPercent:     number // percentual de reembolso na faixa do meio (default 70)
  latePercent:        number // percentual de reembolso na faixa mais curta (default 50)
}

const DEFAULT_CANCELLATION: CancellationConfig = {
  fullRefundHours:    24,
  partialRefundHours: 6,
  partialPercent:     70,
  latePercent:        50,
}

export async function getCancellationConfig(): Promise<CancellationConfig> {
  try {
    const map = await loadConfig()
    const full    = intFrom(map, "cancelationFullRefundHours")
    const partial = intFrom(map, "cancelationPartialRefundHours")
    const pPct    = intFrom(map, "cancelationPartialPercent")
    const lPct    = intFrom(map, "cancelationLatePercent")
    return {
      fullRefundHours:    Number.isFinite(full)    ? full    : DEFAULT_CANCELLATION.fullRefundHours,
      partialRefundHours: Number.isFinite(partial) ? partial : DEFAULT_CANCELLATION.partialRefundHours,
      partialPercent:     Number.isFinite(pPct)    ? pPct    : DEFAULT_CANCELLATION.partialPercent,
      latePercent:        Number.isFinite(lPct)    ? lPct    : DEFAULT_CANCELLATION.latePercent,
    }
  } catch {
    return DEFAULT_CANCELLATION
  }
}

// ─── Cupom por avaliação (P3-20) ──────────────────────────────────────────────

export interface ReviewCouponConfig {
  enabled:      boolean // chave reviewCouponEnabled ("true"/"false")
  percentOff:   number  // chave reviewCouponPercent (default 10)
  validityDays: number  // chave reviewCouponValidityDays (default 90)
}

// Fundadores decidiram NÃO bonificar avaliações no lançamento (2026-06-21).
// Default false — reativar inserindo reviewCouponEnabled="true" em PlatformConfig via /admin/financeiro.
const DEFAULT_REVIEW_COUPON: ReviewCouponConfig = { enabled: false, percentOff: 10, validityDays: 90 }

export async function getReviewCouponConfig(): Promise<ReviewCouponConfig> {
  try {
    const map = await loadConfig()
    const percent  = intFrom(map, "reviewCouponPercent")
    const validity = intFrom(map, "reviewCouponValidityDays")
    return {
      enabled:      map.reviewCouponEnabled !== undefined ? map.reviewCouponEnabled === "true" : DEFAULT_REVIEW_COUPON.enabled,
      percentOff:   Number.isFinite(percent)  && percent  > 0 ? percent  : DEFAULT_REVIEW_COUPON.percentOff,
      validityDays: Number.isFinite(validity) && validity > 0 ? validity : DEFAULT_REVIEW_COUPON.validityDays,
    }
  } catch {
    return DEFAULT_REVIEW_COUPON
  }
}

// ─── Thresholds de embaixador ─────────────────────────────────────────────────

export interface AmbassadorThresholds {
  silverThreshold: number // indicados ativos para tier Prata (default 11)
  goldThreshold:   number // indicados ativos para tier Ouro (default 51)
}

const DEFAULT_AMBASSADOR_THRESHOLDS: AmbassadorThresholds = { silverThreshold: 11, goldThreshold: 51 }

export async function getAmbassadorThresholds(): Promise<AmbassadorThresholds> {
  try {
    const map = await loadConfig()
    const silver = intFrom(map, "ambassadorSilverThreshold")
    const gold   = intFrom(map, "ambassadorGoldThreshold")
    return {
      silverThreshold: Number.isFinite(silver) ? silver : DEFAULT_AMBASSADOR_THRESHOLDS.silverThreshold,
      goldThreshold:   Number.isFinite(gold)   ? gold   : DEFAULT_AMBASSADOR_THRESHOLDS.goldThreshold,
    }
  } catch {
    return DEFAULT_AMBASSADOR_THRESHOLDS
  }
}

// ─── Janela de referral ───────────────────────────────────────────────────────

const DEFAULT_REFERRAL_WINDOW_DAYS = 30

export async function getReferralWindowDays(): Promise<number> {
  try {
    const map = await loadConfig()
    const v = intFrom(map, "referralWindowDays")
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_REFERRAL_WINDOW_DAYS
  } catch {
    return DEFAULT_REFERRAL_WINDOW_DAYS
  }
}

// ─── Auto-cancelamento de reservas ───────────────────────────────────────────

export interface AutoCancelConfig {
  pendingHours: number // horas até cancelar PENDING sem resposta (default 12)
  ownerHours:   number // horas até cancelar quando proprietário não age (default 48)
}

/** Faixa válida para autoCancelPendingHours (editável via /admin/reservas). */
export const AUTO_CANCEL_PENDING_HOURS_MIN = 1
export const AUTO_CANCEL_PENDING_HOURS_MAX = 168 // 7 dias

const DEFAULT_AUTO_CANCEL: AutoCancelConfig = { pendingHours: 12, ownerHours: 48 }

export async function getAutoCancelConfig(): Promise<AutoCancelConfig> {
  try {
    const map = await loadConfig()
    const pending = intFrom(map, "autoCancelPendingHours")
    const owner   = intFrom(map, "autoCancelOwnerHours")
    return {
      pendingHours: Number.isFinite(pending) && pending > 0 ? pending : DEFAULT_AUTO_CANCEL.pendingHours,
      ownerHours:   Number.isFinite(owner)   && owner   > 0 ? owner   : DEFAULT_AUTO_CANCEL.ownerHours,
    }
  } catch {
    return DEFAULT_AUTO_CANCEL
  }
}

// ─── Janela de payout ─────────────────────────────────────────────────────────

const DEFAULT_PAYOUT_WINDOW_DAYS = 3

export async function getPayoutWindowDays(): Promise<number> {
  try {
    const map = await loadConfig()
    const v = intFrom(map, "payoutWindowDays")
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_PAYOUT_WINDOW_DAYS
  } catch {
    return DEFAULT_PAYOUT_WINDOW_DAYS
  }
}

// ─── Limites de upload ────────────────────────────────────────────────────────

export interface UploadLimits {
  maxImagesPerItem: number // máx fotos por item (default 10)
  maxUploadSizeMB:  number // máx MB por arquivo (default 10)
}

const DEFAULT_UPLOAD_LIMITS: UploadLimits = { maxImagesPerItem: 10, maxUploadSizeMB: 10 }

export async function getUploadLimits(): Promise<UploadLimits> {
  try {
    const map = await loadConfig()
    const maxImages = intFrom(map, "maxImagesPerItem")
    const maxSize   = intFrom(map, "maxUploadSizeMB")
    return {
      maxImagesPerItem: Number.isFinite(maxImages) && maxImages > 0 ? maxImages : DEFAULT_UPLOAD_LIMITS.maxImagesPerItem,
      maxUploadSizeMB:  Number.isFinite(maxSize)   && maxSize   > 0 ? maxSize   : DEFAULT_UPLOAD_LIMITS.maxUploadSizeMB,
    }
  } catch {
    return DEFAULT_UPLOAD_LIMITS
  }
}

// ─── Multiplicador de taxa de atraso ─────────────────────────────────────────

// Armazenado como inteiro × 100 (ex: 150 = 1.5×). Default 150.
const DEFAULT_LATE_FEE_MULTIPLIER_X100 = 150

export async function getLateFeeMultiplier(): Promise<number> {
  try {
    const map = await loadConfig()
    const v = intFrom(map, "lateFeeMultiplierX100")
    return Number.isFinite(v) && v > 0 ? v / 100 : DEFAULT_LATE_FEE_MULTIPLIER_X100 / 100
  } catch {
    return DEFAULT_LATE_FEE_MULTIPLIER_X100 / 100
  }
}

// ─── Raio máximo da ordenação por proximidade ────────────────────────────────

/**
 * Teto de distância, em km, aplicado quando o visitante ordena por
 * "Mais próximos" em /itens. Vale SÓ para essa ordenação: nas demais o catálogo
 * inteiro continua visível, senão quem mora longe de qualquer anunciante veria
 * uma vitrine vazia.
 *
 * 50 km cobre uma região metropolitana inteira — largo o suficiente para não
 * esvaziar o resultado numa base ainda pequena, e curto o suficiente para
 * "próximo" significar alguma coisa.
 *
 * Editável pelo admin em /admin/itens (chave `searchMaxDistanceKm`).
 */
const DEFAULT_SEARCH_MAX_DISTANCE_KM = 50

/** Limite de sanidade: acima disto "proximidade" perde sentido prático. */
export const SEARCH_MAX_DISTANCE_LIMIT_KM = 500

export async function getSearchMaxDistanceKm(): Promise<number> {
  try {
    const map = await loadConfig()
    const v = intFrom(map, "searchMaxDistanceKm")
    return Number.isFinite(v) && v > 0 && v <= SEARCH_MAX_DISTANCE_LIMIT_KM
      ? v
      : DEFAULT_SEARCH_MAX_DISTANCE_KM
  } catch {
    // Falha de banco não pode derrubar a busca: cai no default.
    return DEFAULT_SEARCH_MAX_DISTANCE_KM
  }
}

/**
 * Lê a taxa da plataforma do banco. Retorna o padrão (1500) se não encontrar.
 * Nunca lança exceção — usado no caminho crítico do checkout.
 */
export async function getPlatformFeeRate(): Promise<number> {
  try {
    const map = await loadConfig()
    if (map.platformFeeRate === undefined) return DEFAULT_FEE_RATE
    const rate = parseInt(map.platformFeeRate, 10)
    return isNaN(rate) || rate < 0 || rate > 10000 ? DEFAULT_FEE_RATE : rate
  } catch {
    return DEFAULT_FEE_RATE
  }
}

/** Calcula os valores financeiros de uma reserva. Todos os valores em centavos. */
export function calcSplit(totalPrice: number, feeRate: number) {
  const platformFeeAmount = Math.round(totalPrice * feeRate / 10000)
  const ownerNetAmount    = totalPrice - platformFeeAmount
  return { platformFeeRate: feeRate, platformFeeAmount, ownerNetAmount }
}

export const CHECKOUT_MAX_CENTS = 50_000 // R$ 500,00 — teto MVP (D2)

/** Expiração da sessão Stripe Checkout em segundos (mín. 30min exigido pela Stripe) */
export const STRIPE_CHECKOUT_EXPIRES_SECONDS = 30 * 60

// ─── Aceite eletrônico do contrato de locação (D4 Jurídico) ─────────────────
// Flag de feature: PlatformConfig.rentalContractAcceptanceEnabled
// Default OFF — com a flag desligada o fluxo de reserva atual NÃO muda.
// Ativar só após aprovação do parecer jurídico D4 e revisão do texto do contrato.

export interface RentalContractConfig {
  enabled: boolean // chave rentalContractAcceptanceEnabled ("true"/"false")
}

const DEFAULT_RENTAL_CONTRACT: RentalContractConfig = { enabled: false }

/**
 * Lê a configuração do aceite eletrônico do contrato de locação.
 * Nunca lança exceção — usado no caminho crítico do POST /api/bookings.
 * Default OFF garante que o comportamento atual não muda até ativação explícita.
 */
export async function getRentalContractConfig(): Promise<RentalContractConfig> {
  try {
    const map = await loadConfig()
    return {
      enabled: map.rentalContractAcceptanceEnabled === "true",
    }
  } catch {
    return DEFAULT_RENTAL_CONTRACT
  }
}

// ─── Mercado Pago (Modelo B / split — EM IMPLANTAÇÃO, gated D4) ──────────────
// Flag de feature: PlatformConfig.mercadoPagoEnabled
// Default OFF — com a flag desligada o fluxo de pagamento atual (Stripe
// oculto) NÃO muda. Ativar só após: parecer FORMAL do D4 + contrato PSP +
// credenciais configuradas (ver lib/mercadopago.ts e docs/juridico/mercadopago-procedimentos-fundadores.md).
// ADR-026 supersede ADR-012.

export interface MercadoPagoConfig {
  enabled: boolean // chave mercadoPagoEnabled ("true"/"false")
}

const DEFAULT_MERCADO_PAGO: MercadoPagoConfig = { enabled: false }

/**
 * Lê a configuração do Mercado Pago.
 * Nunca lança exceção — usado no caminho crítico do checkout.
 * Default OFF garante que o comportamento atual não muda até ativação explícita.
 */
export async function getMercadoPagoConfig(): Promise<MercadoPagoConfig> {
  try {
    const map = await loadConfig()
    return {
      enabled: map.mercadoPagoEnabled === "true",
    }
  } catch {
    return DEFAULT_MERCADO_PAGO
  }
}

// ─── Consentimento biométrico da selfie (KYC — LGPD art. 11, gated D4) ───────
// Flag de feature: PlatformConfig.biometricConsentRequired
// Default OFF — com a flag desligada o fluxo de KYC atual NÃO muda (nenhum passo
// de consentimento na UI, nenhum bloqueio na API). Ativar só após parecer D4 +
// aprovação do texto pelo DPO. Ver docs/juridico/spec-consentimento-biometria-c1.md.

export interface BiometricConsentConfig {
  required: boolean // chave biometricConsentRequired ("true"/"false")
}

const DEFAULT_BIOMETRIC_CONSENT: BiometricConsentConfig = { required: false }

/**
 * Lê a configuração do consentimento biométrico.
 * Nunca lança exceção — usado no caminho do upload de KYC.
 * Default OFF garante que o comportamento atual não muda até ativação explícita.
 */
export async function getBiometricConsentConfig(): Promise<BiometricConsentConfig> {
  try {
    const map = await loadConfig()
    return {
      required: map.biometricConsentRequired === "true",
    }
  } catch {
    return DEFAULT_BIOMETRIC_CONSENT
  }
}

// ─── Stripe Connect (PSP definitivo — ADR-028, EM CONSTRUÇÃO) ────────────────
// Flag de feature: PlatformConfig.stripeConnectEnabled
// Default OFF — com a flag desligada, o onboarding do proprietário via Stripe
// Connect não fica visível/alcançável (mesmo padrão de getMercadoPagoConfig).
// Ativar só depois que a conta Stripe da plataforma tiver o perfil de Connect
// habilitado no Dashboard e o fluxo tiver sido validado em staging.

export interface StripeConnectConfig {
  enabled: boolean // chave stripeConnectEnabled ("true"/"false")
}

const DEFAULT_STRIPE_CONNECT: StripeConnectConfig = { enabled: false }

/**
 * Lê a configuração do onboarding Stripe Connect.
 * Nunca lança exceção — default OFF garante que nada muda até ativação explícita.
 */
export async function getStripeConnectConfig(): Promise<StripeConnectConfig> {
  try {
    const map = await loadConfig()
    return {
      enabled: map.stripeConnectEnabled === "true",
    }
  } catch {
    return DEFAULT_STRIPE_CONNECT
  }
}

const DEFAULT_WEEKLY_MULTIPLIER  = 3   // preço semanal = 3× diária
const DEFAULT_MONTHLY_MULTIPLIER = 15  // preço mensal  = 15× diária

/**
 * Lê os multiplicadores de precificação sugeridos do banco.
 * Nunca lança exceção — usado no formulário de anúncio.
 */
export async function getPricingMultipliers(): Promise<{ weeklyMultiplier: number; monthlyMultiplier: number }> {
  try {
    const map = await loadConfig()
    const w = map.pricingWeeklyMultiplier  !== undefined ? parseInt(map.pricingWeeklyMultiplier,  10) : DEFAULT_WEEKLY_MULTIPLIER
    const m = map.pricingMonthlyMultiplier !== undefined ? parseInt(map.pricingMonthlyMultiplier, 10) : DEFAULT_MONTHLY_MULTIPLIER
    return {
      weeklyMultiplier:  isNaN(w) || w < 1 || w > 52 ? DEFAULT_WEEKLY_MULTIPLIER  : w,
      monthlyMultiplier: isNaN(m) || m < 1 || m > 90 ? DEFAULT_MONTHLY_MULTIPLIER : m,
    }
  } catch {
    return { weeklyMultiplier: DEFAULT_WEEKLY_MULTIPLIER, monthlyMultiplier: DEFAULT_MONTHLY_MULTIPLIER }
  }
}
