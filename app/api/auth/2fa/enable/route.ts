import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { confirmEnrollment } from "@/lib/auth/mfa"
import { invalidateUserSessions } from "@/lib/redis-admin-blocklist"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const BodySchema = z.object({ code: z.string().min(1).max(12) })

/**
 * Confirma o cadastro do autenticador com um código do app e devolve os códigos
 * de recuperação (única vez em que existem em claro).
 *
 * Encerra as sessões anteriores do admin: a sessão que fez o cadastro nasceu SEM
 * o segundo fator, então ela não pode continuar valendo — o admin entra de novo
 * já com o código, que é também a prova de que o autenticador funciona.
 *
 * Quem não é admin ativo não chega a ter segredo pendente, e `confirmEnrollment`
 * recusa (null) — por isso não há uma leitura de papel antes.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }
  const userId = session.user.id

  const rl = await checkRateLimit(`mfa:enable:${userId}`, RATE_LIMITS.adminMfa.limit, RATE_LIMITS.adminMfa.windowMs)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Informe o código de 6 dígitos." } }, { status: 400 })
  }

  const recoveryCodes = await confirmEnrollment(userId, parsed.data.code)
  if (!recoveryCodes) {
    return NextResponse.json(
      { error: { code: "INVALID_CODE", message: "Código incorreto. Confira o app e tente de novo." } },
      { status: 400 },
    )
  }

  await invalidateUserSessions(userId)
  after(() =>
    prisma.adminLog
      .create({ data: { adminId: userId, action: "MFA_ENABLED", entityType: "User", entityId: userId } })
      .catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e)),
  )

  return NextResponse.json({ data: { recoveryCodes } }, { headers: { "Cache-Control": "no-store" } })
}
