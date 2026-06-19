import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { sendPasswordResetEmail } from "@/lib/email"
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/auth-config"

const Schema = z.object({
  email: z.string().email("E-mail inválido"),
})

// Sempre retorna 200 para não vazar quais e-mails existem.
// Cria uma NOVA Response a cada chamada: o body de uma Response é um stream consumível
// uma única vez — reusar a mesma instância faz a 2ª resposta (mesma lambda quente) sair
// com body vazio (HTTP 200 sem corpo). Por isso é função, não singleton de módulo.
function ok() {
  return NextResponse.json(
    { data: { message: "Se este e-mail estiver cadastrado, enviaremos as instruções em breve." } },
    { status: 200 },
  )
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rl = await checkRateLimit(`forgot-password:${ip}`, RATE_LIMITS.forgotPassword.limit, RATE_LIMITS.forgotPassword.windowMs, req)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return ok()  // não vaza info sobre e-mails

    const { email } = parsed.data

    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase() },
      select: { id: true, name: true, deletedAt: true },
    })

    if (!user || user.deletedAt) return ok()

    // Invalida tokens anteriores do mesmo e-mail
    await prisma.passwordResetToken.deleteMany({ where: { email: email.toLowerCase() } })

    const token = crypto.randomBytes(32).toString("hex")
    await prisma.passwordResetToken.create({
      data: {
        email:     email.toLowerCase(),
        token,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
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

    return ok()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/forgot-password]", msg)
    return ok()  // nunca expõe erro para não vazar informação
  }
}
