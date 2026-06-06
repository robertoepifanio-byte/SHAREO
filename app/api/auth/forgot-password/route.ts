import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"
import { sendPasswordResetEmail } from "@/lib/email"

const Schema = z.object({
  email: z.string().email("E-mail inválido"),
})

// Sempre retorna 200 para não vazar quais e-mails existem
const OK = NextResponse.json(
  { data: { message: "Se este e-mail estiver cadastrado, enviaremos as instruções em breve." } },
  { status: 200 }
)

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rl = await checkRateLimit(`forgot-password:${ip}`, 3, 60_000, req) // 3 por minuto por IP
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return OK  // não vaza info sobre e-mails

    const { email } = parsed.data

    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase() },
      select: { id: true, name: true, deletedAt: true },
    })

    if (!user || user.deletedAt) return OK

    // Invalida tokens anteriores do mesmo e-mail
    await prisma.passwordResetToken.deleteMany({ where: { email: email.toLowerCase() } })

    const token = crypto.randomBytes(32).toString("hex")
    await prisma.passwordResetToken.create({
      data: {
        email:     email.toLowerCase(),
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),  // 1 hora
      },
    })

    // ── Enviar e-mail ─────────────────────────────────────────────────────────
    try {
      await sendPasswordResetEmail(email.toLowerCase(), user.name, token)
      console.warn(`[forgot-password] email sent (token ${token.slice(0, 8)}…)`)
    } catch (emailErr) {
      // Falha no envio não expõe informação ao cliente — token já está salvo no DB.
      // O usuário pode tentar novamente e o e-mail será reenviado.
      console.error("[forgot-password] email error:", emailErr instanceof Error ? emailErr.message : emailErr)
    }

    return OK
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/forgot-password]", msg)
    return OK  // nunca expõe erro para não vazar informação
  }
}
