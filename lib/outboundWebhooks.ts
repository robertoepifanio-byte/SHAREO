import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { isUrlSafeForWebhook } from "@/lib/ssrfGuard"

// ─── Eventos suportados ───────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  "booking.created",
  "booking.confirmed",
  "booking.cancelled",
  "booking.paid",
  "booking.active",
  "booking.returned",
  "booking.completed",
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

// ─── Assinatura ───────────────────────────────────────────────────────────────

function sign(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

// ─── Disparo de um único webhook ─────────────────────────────────────────────

async function fireOne(
  webhookId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  data: unknown,
): Promise<void> {
  const body      = JSON.stringify({ event, timestamp: new Date().toISOString(), data })
  const signature = sign(body, secret)

  let statusCode: number | null = null

  // SSRF guard (S14-SEC-03): bloqueia URL que resolve p/ IP privado/loopback/metadata.
  if (!(await isUrlSafeForWebhook(url))) {
    console.error(`[webhook] URL bloqueada (SSRF guard): ${url}`)
    await prisma.outboundWebhook.update({
      where: { id: webhookId },
      data:  { lastFiredAt: new Date(), lastStatusCode: null, failureCount: { increment: 1 } },
    }).catch(() => void 0)
    return
  }

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-ShareO-Event":  event,
        "X-ShareO-Signature": signature,
        "User-Agent":      "ShareO-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10 segundos timeout
    })
    statusCode = res.status

    await prisma.outboundWebhook.update({
      where: { id: webhookId },
      data: {
        lastFiredAt:    new Date(),
        lastStatusCode: statusCode,
        // Reset failureCount on success (2xx)
        ...(res.ok && { failureCount: 0 }),
        // Increment failureCount on failure
        ...(!res.ok && { failureCount: { increment: 1 } }),
        // Desativar automaticamente após 10 falhas consecutivas
        ...(!res.ok && { isActive: { set: true } }), // mantém ativo; desativa abaixo se necessário
      },
    })

    // Desativar após 10 falhas consecutivas
    if (!res.ok) {
      const wh = await prisma.outboundWebhook.findUnique({
        where:  { id: webhookId },
        select: { failureCount: true },
      })
      if (wh && wh.failureCount >= 10) {
        await prisma.outboundWebhook.update({
          where: { id: webhookId },
          data:  { isActive: false },
        })
      }
    }
  } catch (err) {
    console.error(`[webhook] failed to deliver ${event} to ${url}:`, err instanceof Error ? err.message : err)
    await prisma.outboundWebhook.update({
      where: { id: webhookId },
      data: {
        lastFiredAt:    new Date(),
        lastStatusCode: null,
        failureCount:   { increment: 1 },
      },
    }).catch(() => void 0)
  }
}

// ─── Ponto de entrada público ─────────────────────────────────────────────────
// Chame esta função em qualquer evento de booking, dentro de after() de
// "next/server" — a promise retornada mantém a lambda viva até o término.
// Erros são apenas logados; nunca propaga exceção.

export async function dispatchWebhookEvent(
  ownerId: string,
  event: WebhookEvent,
  data: unknown,
): Promise<void> {
  try {
    const hooks = await prisma.outboundWebhook.findMany({
      where: { userId: ownerId, isActive: true, events: { has: event } },
      select: { id: true, url: true, secret: true },
    })
    await Promise.all(
      hooks.map((hook) =>
        fireOne(hook.id, hook.url, hook.secret, event, data).catch((e) =>
          console.error("[webhook] unexpected error:", e instanceof Error ? e.message : e),
        ),
      ),
    )
  } catch (e) {
    console.error("[webhook] db query error:", e instanceof Error ? e.message : e)
  }
}
