/**
 * P3-20 — Cupons de desconto por avaliação.
 *
 * Regras:
 *  - 1 cupom por reserva avaliada por usuário (enforced por @@unique([userId, sourceBookingId]))
 *  - Percentual e validade configuráveis em PlatformConfig (getReviewCouponConfig)
 *  - O desconto é absorvido pela taxa da plataforma — o proprietário recebe o valor cheio
 */
import { prisma } from "@/lib/prisma"
import { getReviewCouponConfig } from "@/lib/platform-config"

function generateCouponCode(percentOff: number): string {
  const suffix = Array.from({ length: 5 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("")
  return `SHARE${percentOff}-${suffix}`
}

/**
 * Emite o cupom de recompensa por avaliação (idempotente por reserva+usuário).
 * Chamada via after() no POST de reviews — falhas são logadas, nunca propagadas.
 */
export async function issueReviewCoupon(userId: string, sourceBookingId: string): Promise<void> {
  try {
    const config = await getReviewCouponConfig()
    if (!config.enabled) return

    const existing = await prisma.coupon.findUnique({
      where: { userId_sourceBookingId: { userId, sourceBookingId } },
      select: { id: true },
    })
    if (existing) return

    const expiresAt = new Date(Date.now() + config.validityDays * 24 * 60 * 60 * 1000)
    const coupon = await prisma.coupon.create({
      data: {
        userId,
        code: generateCouponCode(config.percentOff),
        percentOff: config.percentOff,
        sourceBookingId,
        expiresAt,
      },
      select: { code: true, percentOff: true },
    })

    await prisma.notification.create({
      data: {
        userId,
        type:  "COUPON_EARNED",
        title: `Você ganhou ${coupon.percentOff}% de desconto! 🎉`,
        body:  `Obrigado por avaliar! Use o cupom ${coupon.code} na sua próxima locação (válido por ${config.validityDays} dias).`,
        data:  { couponCode: coupon.code },
      },
    })
  } catch (e) {
    // Violação de unique em corrida (duas reviews simultâneas) é esperada — silenciar
    console.error("[issueReviewCoupon]", e instanceof Error ? e.message : e)
  }
}

export type CouponValidation =
  | { ok: true; couponId: string; percentOff: number }
  | { ok: false; reason: "NOT_FOUND" | "USED" | "EXPIRED" }

/** Valida um cupom para uso pelo usuário. Não consome — o consumo acontece na transação da reserva. */
export async function validateCoupon(code: string, userId: string): Promise<CouponValidation> {
  const coupon = await prisma.coupon.findFirst({
    where:  { code: code.trim().toUpperCase(), userId },
    select: { id: true, percentOff: true, usedAt: true, expiresAt: true },
  })
  if (!coupon)                      return { ok: false, reason: "NOT_FOUND" }
  if (coupon.usedAt)                return { ok: false, reason: "USED" }
  if (coupon.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" }
  return { ok: true, couponId: coupon.id, percentOff: coupon.percentOff }
}

/** Devolve o cupom ao usuário quando a reserva é cancelada/recusada antes de ativar. */
export async function releaseCouponForBooking(bookingId: string): Promise<void> {
  try {
    await prisma.coupon.updateMany({
      where: { bookingId },
      data:  { usedAt: null, bookingId: null },
    })
  } catch (e) {
    console.error("[releaseCouponForBooking]", e instanceof Error ? e.message : e)
  }
}
