import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { getPlatformPixConfig, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/bookings/[id]/declare-pix
 *
 * Checkout PIX manual (fase de validação em staging): o LOCATÁRIO declara que
 * pagou na chave PIX da plataforma. Não marca como pago — apenas registra
 * `pixDeclaredAt` e notifica os admins, que conferem o extrato e confirmam o
 * recebimento via /api/admin/bookings/[id]/confirm-pix.
 *
 * Só funciona quando o PIX da plataforma está habilitado (PlatformConfig).
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const rl = await checkRateLimit(`declare-pix:${session.user.id}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const pix = await getPlatformPixConfig()
    if (!pix.enabled) {
      return NextResponse.json(
        { error: { code: "PIX_DISABLED", message: "Pagamento via PIX indisponível." } },
        { status: 422 },
      )
    }

    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, borrowerId: true, status: true, paymentStatus: true,
        totalPrice: true, pixDeclaredAt: true,
        item: { select: { title: true } },
        borrower: { select: { name: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    // Apenas o locatário declara o próprio pagamento
    if (booking.borrowerId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_CONFIRMED", message: "A reserva precisa ser confirmada pelo locador antes do pagamento." } },
        { status: 422 },
      )
    }

    if (booking.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: { code: "ALREADY_PAID", message: "Esta reserva já foi paga." } },
        { status: 409 },
      )
    }

    if (booking.totalPrice > CHECKOUT_MAX_CENTS) {
      return NextResponse.json(
        { error: { code: "EXCEEDS_MVP_LIMIT", message: "Locações acima de R$ 500 não estão disponíveis nesta versão." } },
        { status: 422 },
      )
    }

    // Idempotente: se já declarou, não re-notifica os admins.
    if (booking.pixDeclaredAt) {
      return NextResponse.json({ data: { pixDeclaredAt: booking.pixDeclaredAt, alreadyDeclared: true } })
    }

    const now = new Date()
    await prisma.booking.update({
      where: { id },
      data:  { pixDeclaredAt: now },
    })

    // Notifica os admins que conferem o recebimento (financeiro + superadmin) — após a resposta
    after(async () => {
      const admins = await prisma.user.findMany({
        where:  { role: "ADMIN", adminRole: { in: ["ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO"] } },
        select: { id: true },
      }).catch(() => [])
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type:   "BOOKING_CONFIRMED" as never, // reaproveita tipo existente (sem enum de pagamento)
            title:  "PIX informado — confirmar recebimento",
            body:   `${booking.borrower.name} informou pagamento via PIX de "${booking.item.title}". Confira o extrato e confirme.`,
            data:   { bookingId: id, kind: "PIX_DECLARED" },
          },
        }).catch((e) => console.error("[declare-pix notification]", e instanceof Error ? e.message : e))
      }
    })

    return NextResponse.json({ data: { pixDeclaredAt: now } })
  } catch (e) {
    console.error("[POST /api/bookings/:id/declare-pix]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
