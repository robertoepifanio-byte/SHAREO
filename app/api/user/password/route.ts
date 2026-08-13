import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { invalidateUserSessions } from "@/lib/redis-admin-blocklist"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "Mínimo 8 caracteres"),
})

export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const rl = await checkRateLimit(`pwd-change:${userId}`, RATE_LIMITS.passwordChange.limit, RATE_LIMITS.passwordChange.windowMs)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 422 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { passwordHash: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Conta sem senha local" }, { status: 400 })
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: newHash },
  })

  // SEC-CRIT-04: invalida sessões anteriores — um token roubado deixa de valer.
  //
  // O resultado é DEVOLVIDO na resposta. Antes a falha era engolida e o usuário
  // recebia `{ ok: true }` mesmo quando as outras sessões seguiam válidas — ou
  // seja, a interface afirmava exatamente a garantia que não tinha acontecido.
  // A senha em si já foi trocada e isso não se desfaz; o que muda é a UI poder
  // dizer a verdade e orientar a repetir, em vez de dar por encerrado.
  const sessionsRevoked = await invalidateUserSessions(userId)

  return NextResponse.json({ ok: true, sessionsRevoked })
}
