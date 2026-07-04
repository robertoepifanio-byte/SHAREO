import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { sendVerificationEmail } from "@/lib/email"
import { invalidateUserSessions } from "@/lib/redis-admin-blocklist"
import { hashToken } from "@/lib/crypto"

const schema = z.object({
  newEmail:        z.string().email("E-mail inválido"),
  currentPassword: z.string().min(1, "Senha obrigatória"),
})

export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const rl = await checkRateLimit(`email-change:${userId}`, RATE_LIMITS.emailChange.limit, RATE_LIMITS.emailChange.windowMs)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 422 },
    )
  }

  const { newEmail, currentPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { email: true, name: true, passwordHash: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Conta sem senha local" }, { status: 400 })
  }

  if (user.email.toLowerCase() === newEmail.toLowerCase()) {
    return NextResponse.json({ error: "O novo e-mail é igual ao atual" }, { status: 422 })
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 400 })
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() }, select: { id: true } })
  if (taken) {
    return NextResponse.json({ error: "E-mail já cadastrado em outra conta" }, { status: 409 })
  }

  // Atualiza e-mail, limpa verificação anterior e gera novo token
  // A1 (SEC-ALTO): token em claro vai no e-mail; banco guarda apenas o hash SHA-256
  // (paridade com register/resend-verification/verify-email que já usam hashToken).
  const verifyToken    = crypto.randomBytes(32).toString("hex")
  const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h

  await prisma.user.update({
    where: { id: userId },
    data:  {
      email:               newEmail.toLowerCase(),
      emailVerified:       null,
      emailVerifyToken:    hashToken(verifyToken),
      emailTokenExpiresAt: tokenExpiresAt,
    },
  })

  // SEC-CRIT-04: troca de e-mail também invalida sessões anteriores
  await invalidateUserSessions(userId)

  // Envia verificação para o novo endereço — após a resposta
  after(() =>
    sendVerificationEmail(newEmail, user.name, verifyToken).catch((err) =>
      console.error("[email-change] send verification error:", err instanceof Error ? err.message : err)
    )
  )

  return NextResponse.json({ ok: true })
}
