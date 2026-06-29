import { NextResponse } from "next/server"
import crypto from "crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isMercadoPagoActive, getPaymentClient } from "@/lib/mercadopago"
import { markRentalPaid } from "@/lib/payments/mark-booking-paid"

export const dynamic = "force-dynamic"

/**
 * Webhook do Mercado Pago (Modelo B — ADR-026). Notificações em 2 tempos:
 * recebe o id do pagamento → consulta `GET /v1/payments/{id}` → se `approved`,
 * marca a reserva como paga (paridade com o webhook do Stripe).
 *
 * - Assinatura: valida `x-signature` (HMAC) quando MP_WEBHOOK_SECRET está setado.
 * - Idempotência: dedupe pela id da notificação via MercadoPagoEventQueue.
 * - Gating: flag + credenciais → senão 404.
 */
export async function POST(req: Request) {
  if (!(await isMercadoPagoActive())) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const raw = await req.text()
  let payload: { id?: number | string; type?: string; action?: string; data?: { id?: string } }
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const url        = new URL(req.url)
  const type       = payload.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? ""
  const dataId     = payload.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? ""
  const eventId    = String(payload.id ?? `${type}:${dataId}:${payload.action ?? ""}`)

  // Validação de assinatura (quando o secret está configurado).
  const secret = process.env.MP_WEBHOOK_SECRET
  if (secret) {
    if (!verifySignature(req, dataId, secret)) {
      console.warn("[mp webhook] assinatura inválida")
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  } else {
    console.warn("[mp webhook] MP_WEBHOOK_SECRET ausente — pulando validação de assinatura (sandbox)")
  }

  // Só tratamos notificações de pagamento.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true, ignored: true })
  }

  // Idempotência: dedupe pela id da notificação. COMPLETED → 200 direto.
  const prior = await prisma.mercadoPagoEventQueue
    .findUnique({ where: { mpEventId: eventId }, select: { status: true } })
    .catch(() => null)
  if (prior?.status === "COMPLETED") {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await prisma.mercadoPagoEventQueue.upsert({
      where:  { mpEventId: eventId },
      create: { mpEventId: eventId, type, payload: payload as unknown as Prisma.InputJsonValue, status: "PROCESSING" },
      update: { status: "PROCESSING", attempts: { increment: 1 } },
    })

    // Tempo 2: consulta o pagamento real (não confiar no corpo da notificação).
    const payment = await getPaymentClient().get({ id: String(dataId) })

    if (payment.status === "approved") {
      const bookingId = payment.external_reference
      if (bookingId) {
        await markRentalPaid({ bookingId, mpPaymentId: String(payment.id ?? dataId) })
        console.warn(`[mp webhook] booking ${bookingId} pago (payment ${payment.id})`)
      } else {
        console.warn(`[mp webhook] payment ${dataId} approved sem external_reference`)
      }
    } else {
      console.warn(`[mp webhook] payment ${dataId} status=${payment.status} — sem ação`)
    }

    await prisma.mercadoPagoEventQueue.update({
      where: { mpEventId: eventId },
      data:  { status: "COMPLETED", processedAt: new Date() },
    })
  } catch (e) {
    console.error("[mp webhook] erro:", e instanceof Error ? e.message : e)
    await prisma.mercadoPagoEventQueue
      .update({ where: { mpEventId: eventId }, data: { status: "FAILED", lastError: e instanceof Error ? e.message : String(e) } })
      .catch(() => undefined)
    // 500 faz o MP re-tentar a notificação.
    return NextResponse.json({ error: "processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Valida o header `x-signature` do MP.
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com HMAC-SHA256(secret).
 */
function verifySignature(req: Request, dataId: string, secret: string): boolean {
  const sigHeader = req.headers.get("x-signature")
  const requestId = req.headers.get("x-request-id") ?? ""
  if (!sigHeader) return false

  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=")
      return [k?.trim(), v?.trim()]
    }),
  ) as { ts?: string; v1?: string }

  if (!parts.ts || !parts.v1) return false

  // O MP normaliza data.id alfanumérico para minúsculas no manifest.
  const id = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
  } catch {
    return false
  }
}
