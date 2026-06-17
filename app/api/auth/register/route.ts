import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { RegisterMinimalSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { sendVerificationEmail } from "@/lib/email"
import crypto from "crypto"
import { generateUserSlug } from "@/lib/slugify"
import { applyReferralCode } from "@/lib/referral"
import { EMAIL_VERIFY_TOKEN_TTL_MS } from "@/lib/auth-config"

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    // `req` passado p/ honrar o bypass de E2E (header x-e2e-token + E2E_SECRET) na suíte
    // de regressão — sem afrouxar o rate limit em produção (bypass só com o secret correto).
    const rl = await checkRateLimit(`register:${ip}`, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs, req)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = RegisterMinimalSchema.safeParse(body)

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

    const d = parsed.data

    // Uniqueness: e-mail
    const emailExists = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } })
    if (emailExists) {
      return NextResponse.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "E-mail já cadastrado." } },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(d.password, 12)

    // $transaction: criar user → gerar slug com o ID real → atualizar
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name:           d.name,
          email:          d.email,
          passwordHash,
          city:           d.city,
          state:          d.state,
          consentVersion: d.consentVersion,
          consentAt:      new Date(),
          consentIp:      ip,
          ageDeclaredAt:  new Date(), // 18+ declarado no signup mínimo (trilha LGPD)
          // profileCompletedAt permanece null — cadastro completo exigido só ao Anunciar/Alugar
        },
        select: { id: true, name: true, email: true },
      })

      return tx.user.update({
        where: { id: created.id },
        data:  { slug: generateUserSlug(created.name, created.id) },
        select: {
          id:         true,
          name:       true,
          email:      true,
          slug:       true,
          userType:   true,
          role:       true,
          avatarUrl:  true,
          bio:        true,
          city:       true,
          state:      true,
          isVerified: true,
          createdAt:  true,
        },
      })
    })

    // Aplicar código de indicação — após a resposta (não bloqueia registro)
    const referralCode = d.referralCode
    if (referralCode) {
      after(() =>
        applyReferralCode(user.id, referralCode).catch((err) =>
          console.error("[register] referral apply error:", err instanceof Error ? err.message : err)
        )
      )
    }

    // Token de verificação de e-mail — após a resposta (não bloqueia registro)
    const verifyToken   = crypto.randomBytes(32).toString("hex")
    const tokenExpiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS)
    after(() =>
      prisma.user
        .update({
          where: { id: user.id },
          data:  { emailVerifyToken: verifyToken, emailTokenExpiresAt: tokenExpiresAt },
        })
        .then(() => sendVerificationEmail(user.email, user.name, verifyToken))
        .catch((err) =>
          console.error("[register] verification email error:", err instanceof Error ? err.message : err)
        )
    )

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message  : String(e)
    const stack = e instanceof Error ? e.stack     : undefined
    console.error("[POST /api/auth/register] INTERNAL_ERROR:", msg, stack)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente." } },
      { status: 500 },
    )
  }
}
