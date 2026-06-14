import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { invalidateUserSessions } from "@/lib/redis-admin-blocklist"

const Schema = z.object({
  token:    z.string().min(1),
  password: z
    .string()
    .min(8,  "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
})

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rl = await checkRateLimit(`reset-password:${ip}`, RATE_LIMITS.resetPassword.limit, RATE_LIMITS.resetPassword.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = Schema.safeParse(body)

    if (!parsed.success) {
      const details: Record<string, string[]> = {}
      for (const e of parsed.error.errors) {
        const key = e.path.join(".") || "form"
        details[key] = [...(details[key] ?? []), e.message]
      }
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details } },
        { status: 400 },
      )
    }

    const { token, password } = parsed.data

    const record = await prisma.passwordResetToken.findUnique({ where: { token } })

    if (!record) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Link inválido ou expirado." } },
        { status: 400 },
      )
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } })
      return NextResponse.json(
        { error: { code: "EXPIRED_TOKEN", message: "Este link expirou. Solicite um novo." } },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where:  { email: record.email },
      select: { id: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetToken.delete({ where: { token } }),
    ])

    // SEC-CRIT-04 / GAP-CRIT-04b: reset por link também invalida sessões anteriores
    await invalidateUserSessions(user.id)

    return NextResponse.json({ data: { message: "Senha redefinida com sucesso." } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/reset-password]", msg)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente." } },
      { status: 500 },
    )
  }
}
