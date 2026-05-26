import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

    // ── Email ─────────────────────────────────────────────────────────────────
    // Em staging/produção: configure RESEND_API_KEY e envie o e-mail real.
    // Por ora, o token é logado no servidor para facilitar testes em staging.
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "https://shareo-rouge.vercel.app"}/esqueci-senha/${token}`
    console.warn(`[forgot-password] Reset link for ${email}: ${resetUrl}`)  // TODO: enviar por e-mail
    // TODO Sprint 5: integrar Resend / SendGrid para envio real

    return OK
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/forgot-password]", msg)
    return OK  // nunca expõe erro para não vazar informação
  }
}
