import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import QRCode from "qrcode"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startEnrollment } from "@/lib/auth/mfa"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const BodySchema = z.object({ password: z.string().min(1) })

/**
 * Inicia o cadastro do autenticador (2FA) de um administrador.
 *
 * Fica FORA de /api/admin de propósito: quem chega aqui é justamente o admin que
 * ainda não tem o segundo fator, e o middleware barra /api/admin para ele.
 *
 * Exige a SENHA de novo. A sessão de um admin sem 2FA vale o que vale uma senha;
 * sem esta confirmação, quem pegasse uma sessão aberta cadastraria o próprio
 * autenticador no lugar do dono.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }
  const userId = session.user.id

  const rl = await checkRateLimit(`mfa:setup:${userId}`, RATE_LIMITS.passwordChange.limit, RATE_LIMITS.passwordChange.windowMs)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Informe a senha." } }, { status: 400 })
  }

  // A sessão de um admin sem 2FA vem rebaixada (role USER): o papel verdadeiro está no banco.
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { email: true, role: true, passwordHash: true, isActive: true, deletedAt: true, totpEnabledAt: true },
  })
  if (!user || !user.isActive || user.deletedAt || user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Apenas administradores usam o 2FA." } }, { status: 403 })
  }
  if (user.totpEnabledAt) {
    return NextResponse.json(
      { error: { code: "ALREADY_ENABLED", message: "O 2FA já está ativo. Para trocar de aparelho, peça a outro superadmin que o reinicie." } },
      { status: 409 },
    )
  }
  if (!user.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: { code: "WRONG_PASSWORD", message: "Senha incorreta." } }, { status: 403 })
  }

  const enrollment = await startEnrollment(userId, user.email)
  if (!enrollment) {
    return NextResponse.json({ error: { code: "ALREADY_ENABLED" } }, { status: 409 })
  }

  // `no-store`: a resposta carrega o segredo do autenticador.
  return NextResponse.json(
    { data: { secret: enrollment.secret, qr: await QRCode.toDataURL(enrollment.uri, { margin: 1, width: 224 }) } },
    { headers: { "Cache-Control": "no-store" } },
  )
}
