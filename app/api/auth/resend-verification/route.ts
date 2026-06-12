import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { sendVerificationEmail } from "@/lib/email"
import { EMAIL_VERIFY_TOKEN_TTL_MS } from "@/lib/auth-config"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    )
  }

  const userId = session.user.id

  const rl = await checkRateLimit(`resend-verify:${userId}`, RATE_LIMITS.resendVerify.limit, RATE_LIMITS.resendVerify.windowMs, req)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { emailVerified: true, email: true, name: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
      { status: 404 },
    )
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: { code: "ALREADY_VERIFIED", message: "E-mail já verificado." } },
      { status: 400 },
    )
  }

  const verifyToken    = crypto.randomBytes(32).toString("hex")
  const tokenExpiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS)

  await prisma.user.update({
    where: { id: userId },
    data:  { emailVerifyToken: verifyToken, emailTokenExpiresAt: tokenExpiresAt },
  })

  sendVerificationEmail(user.email, user.name, verifyToken).catch((err) =>
    console.error("[resend-verification] email error:", err instanceof Error ? err.message : err)
  )

  return NextResponse.json({ data: { sent: true } })
}
