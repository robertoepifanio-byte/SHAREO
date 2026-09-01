/**
 * GET /api/cron/email-retry
 * Reprocessa entradas PENDING da fila de e-mails críticos (EmailQueue — NFR-BL7).
 * Executado a cada 5 min via Vercel Cron (apertado de 15 min em 28/08/2026 —
 * e-mail de verificação é etapa bloqueante pro cliente; o pior caso (1ª
 * tentativa falhou) não pode fazer ele esperar tanto).
 *
 * Até MAX_ATTEMPTS tentativas por entrada; após isso marca FAILED definitivo e loga.
 * Limitação conhecida: sem alerta Sentry configurado — falhas definitivas ficam em
 * console.error com prefixo "[email-queue] FAILED definitivo" (fácil de grep no Vercel).
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLateFeeEmail,
  sendFounderInviteEmail,
} from "@/lib/email"

export const runtime    = "nodejs"
export const maxDuration = 60

const MAX_ATTEMPTS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const pending = await prisma.emailQueue.findMany({
    where:   { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take:    50,
  })

  const results = { ok: 0, failed: 0, skipped: 0 }

  for (const entry of pending) {
    // Marca PROCESSING antes de tentar — previne pick-up paralelo em execuções simultâneas.
    await prisma.emailQueue.update({
      where: { id: entry.id },
      data:  { status: "PROCESSING" },
    })

    try {
      const p = entry.payloadJson as Record<string, unknown>

      switch (entry.templateKey) {
        case "verification":
          await sendVerificationEmail(
            p.to as string,
            p.name as string,
            p.token as string,
            false, // não re-enfileirar na falha do retry — este cron gerencia as tentativas
          )
          break

        case "password-reset":
          await sendPasswordResetEmail(
            p.to as string,
            p.name as string,
            p.token as string,
            false,
          )
          break

        case "late-fee":
          await sendLateFeeEmail(
            p.to as string,
            p.name as string,
            p.itemTitle as string,
            p.bookingId as string,
            p.lateFeeAmountCents as number,
            p.paymentUrl as string,
            false,
            (p.calculadoAte as string | null) ?? undefined,
          )
          break

        case "founder-invite":
          await sendFounderInviteEmail(
            p.to as string,
            p.name as string,
            p.token as string,
            false,
          )
          break

        default:
          console.error(`[email-queue] templateKey desconhecido: ${entry.templateKey} id=${entry.id}`)
          await prisma.emailQueue.update({
            where: { id: entry.id },
            data:  { status: "FAILED", lastError: `templateKey desconhecido: ${entry.templateKey}` },
          })
          results.skipped++
          continue
      }

      await prisma.emailQueue.update({
        where: { id: entry.id },
        data:  { status: "COMPLETED", processedAt: new Date() },
      })
      results.ok++
    } catch (err) {
      const newAttempts = entry.attempts + 1
      const lastError   = err instanceof Error ? err.message : String(err)
      const isFinal     = newAttempts >= MAX_ATTEMPTS

      await prisma.emailQueue.update({
        where: { id: entry.id },
        data:  { status: isFinal ? "FAILED" : "PENDING", attempts: newAttempts, lastError },
      })

      if (isFinal) {
        console.error(
          `[email-queue] FAILED definitivo to=${entry.to} template=${entry.templateKey} error=${lastError}`,
        )
      }
      results.failed++
    }
  }

  return NextResponse.json({ ok: true, processed: pending.length, sent: results.ok, failed: results.failed, skipped: results.skipped })
}
