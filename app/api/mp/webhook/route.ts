import { NextResponse } from "next/server"
import crypto from "crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { encryptPII, decryptPII } from "@/lib/crypto"
import { isMercadoPagoActive, getPaymentClient, refreshSellerToken, sandboxSellerTokenOverride } from "@/lib/mercadopago"
import { markRentalPaid } from "@/lib/payments/mark-booking-paid"

export const dynamic = "force-dynamic"

/** Serializa um erro (inclusive os objetos do SDK do MP, que não são Error). */
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>
    return String(o.message ?? o.error ?? JSON.stringify(o)).slice(0, 500)
  }
  return String(e)
}

/**
 * Resolve o cliente de Payment para consultar a notificação.
 *
 * No Modelo B (split) o pagamento vive na conta do VENDEDOR — o token da aplicação
 * recebe 404. A notificação traz `user_id` (id do vendedor no MP); usamos isso para
 * achar o `OwnerPaymentAccount`, decriptar o access_token do vendedor (renovando se
 * expirado) e consultar o pagamento com ele. Fallback: token da aplicação.
 */
async function paymentClientForSeller(sellerUserId: string | null) {
  // Sandbox: token via env (pago foi criado com o mesmo token — consulta com ele).
  const sandboxToken = sandboxSellerTokenOverride()
  if (sandboxToken) return getPaymentClient(sandboxToken)

  if (!sellerUserId) return getPaymentClient()

  const acct = await prisma.ownerPaymentAccount.findUnique({
    where:  { mpUserId: sellerUserId },
    select: { mpAccessToken: true, mpRefreshToken: true, mpTokenExpiresAt: true },
  })
  if (!acct?.mpAccessToken || !acct.mpRefreshToken) return getPaymentClient()

  let token = decryptPII(acct.mpAccessToken)
  if (acct.mpTokenExpiresAt && acct.mpTokenExpiresAt < new Date()) {
    const refreshed = await refreshSellerToken(decryptPII(acct.mpRefreshToken))
    token = refreshed.accessToken
    await prisma.ownerPaymentAccount.update({
      where: { mpUserId: sellerUserId },
      data: {
        mpAccessToken:    encryptPII(refreshed.accessToken),
        mpRefreshToken:   encryptPII(refreshed.refreshToken),
        mpTokenExpiresAt: refreshed.expiresAt,
      },
    })
  }
  return getPaymentClient(token)
}

/**
 * Webhook do Mercado Pago (Modelo B — ADR-026). Notificações em 2 tempos:
 * recebe o id do pagamento → consulta `GET /v1/payments/{id}` (com o token do
 * vendedor) → se `approved`, marca a reserva como paga (paridade com o Stripe).
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
  let payload: {
    id?: number | string
    type?: string
    action?: string
    user_id?: number | string
    data?: { id?: string }
  }
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const url    = new URL(req.url)
  const type   = payload.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? ""
  const dataId = payload.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? ""
  const eventId = String(payload.id ?? `${type}:${dataId}:${payload.action ?? ""}`)
  const sellerUserId = payload.user_id != null ? String(payload.user_id) : null

  /**
   * Validação de assinatura — obrigatória fora de sandbox.
   *
   * Antes, sem `MP_WEBHOOK_SECRET` o handler PULAVA a validação e seguia, com um
   * `console.warn` como único sinal. O desenho de dois tempos limita o estrago
   * (não confiamos no payload: consultamos `GET /v1/payments/{id}` e só marcamos
   * pago se o MP disser `approved`), mas isso é mitigação, não autorização —
   * a rota seguia aceitando requisição de qualquer origem, gravando na fila de
   * eventos e disparando consulta com o token do vendedor indicado por quem
   * chamou.
   *
   * O risco não é teórico neste projeto: o painel do `shareo-prod` já ficou com
   * ZERO environment variables e quebrou cadastro em silêncio. Se o MP for ligado
   * em produção sem o secret, o `warn` no log não impede nada.
   *
   * A chave do modo é a PRÓPRIA CREDENCIAL, não `VERCEL_ENV` (que aqui é ambíguo:
   * staging também deploya como "production" no Vercel). Token de teste do MP tem
   * prefixo `TEST-`; qualquer outro é credencial real e exige assinatura.
   */
  const secret = process.env.MP_WEBHOOK_SECRET
  const tokenDeTeste = (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-")

  if (secret) {
    if (!verifySignature(req, dataId, secret)) {
      console.warn("[mp webhook] assinatura inválida")
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  } else if (tokenDeTeste) {
    console.warn("[mp webhook] MP_WEBHOOK_SECRET ausente — pulando validação (sandbox, token TEST-)")
  } else {
    // Credencial real sem secret: RECUSA. Falhar fechado deixa reservas sem
    // marcar como pagas até alguém configurar — e é exatamente isso que se quer,
    // porque aparece no painel de webhooks do MP como erro, alto e imediato, em
    // vez de um aviso de log que ninguém lê enquanto a rota aceita tudo.
    console.error(
      "[mp webhook] RECUSADO: MP_ACCESS_TOKEN é credencial real e MP_WEBHOOK_SECRET não está definida. " +
      "Configure o secret no Vercel E nos GitHub Secrets antes de processar pagamentos.",
    )
    return NextResponse.json(
      { error: "webhook signature not configured" },
      { status: 503 },
    )
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

    // Tempo 2: consulta o pagamento real com o token do VENDEDOR (Modelo B).
    const client  = await paymentClientForSeller(sellerUserId)
    const payment = await client.get({ id: String(dataId) })

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
    const msg = errMsg(e)
    console.error("[mp webhook] erro:", msg)
    await prisma.mercadoPagoEventQueue
      .update({ where: { mpEventId: eventId }, data: { status: "FAILED", lastError: msg } })
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
