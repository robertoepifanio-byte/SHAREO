import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

function secret() {
  const key = process.env.AUTH_SECRET
  if (!key) throw new Error("AUTH_SECRET not set")
  return new TextEncoder().encode(key)
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rl = await checkRateLimit(`mobile-login:${ip}`, RATE_LIMITS.mobileLogin.limit, RATE_LIMITS.mobileLogin.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "E-mail ou senha inválidos." } },
        { status: 400 },
      )
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true,
        userType: true, isVerified: true, avatarUrl: true,
        city: true, state: true, passwordHash: true,
        isActive: true, deletedAt: true,
      },
    })

    if (!user || !user.passwordHash || !user.isActive || user.deletedAt) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." } },
        { status: 401 },
      )
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." } },
        { status: 401 },
      )
    }

    const payload = {
      sub:      user.id,
      email:    user.email,
      role:     user.role,
      userType: user.userType,
    }

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret())

    const refreshToken = await new SignJWT({ sub: user.id, type: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret())

    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json({
      data: {
        accessToken,
        refreshToken,
        user: safeUser,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/mobile/login]", msg)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
