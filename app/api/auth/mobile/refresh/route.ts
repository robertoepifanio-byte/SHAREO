import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jwtVerify, SignJWT } from "jose"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { isSessionStale } from "@/lib/redis-admin-blocklist"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const Schema = z.object({
  refreshToken: z.string().min(1),
})

function secret() {
  const key = process.env.AUTH_SECRET
  if (!key) throw new Error("AUTH_SECRET not set")
  return new TextEncoder().encode(key)
}

export async function POST(req: NextRequest) {
  try {
    // SEC-CRIT-05: rate limit por IP (evita rajada de refresh / DoS no Redis de sessão)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const rl = await checkRateLimit(`mobile-refresh:${ip}`, RATE_LIMITS.mobileRefresh.limit, RATE_LIMITS.mobileRefresh.windowMs, req)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Token inválido." } },
        { status: 400 },
      )
    }

    const { refreshToken } = parsed.data

    let payload: { sub?: string; type?: string }
    try {
      // Pina HS256 (defesa em profundidade — secret simétrico), consistente com
      // lib/resolveUserId.ts. Achado B-01 da revisão s41.
      const { payload: p } = await jwtVerify(refreshToken, secret(), { algorithms: ["HS256"] })
      payload = p as typeof payload
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Token expirado ou inválido." } },
        { status: 401 },
      )
    }

    if (payload.type !== "refresh" || !payload.sub) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Token inválido." } },
        { status: 401 },
      )
    }

    // GAP-CRIT-04b: refresh token emitido antes de troca de senha/e-mail é rejeitado
    const iat = typeof (payload as { iat?: number }).iat === "number" ? (payload as { iat?: number }).iat : undefined
    if (await isSessionStale(payload.sub, iat)) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Sessão expirada. Faça login novamente." } },
        { status: 401 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, role: true,
        userType: true, isVerified: true, avatarUrl: true,
        city: true, state: true, isActive: true, deletedAt: true,
      },
    })

    if (!user || !user.isActive || user.deletedAt) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Usuário não encontrado ou inativo." } },
        { status: 401 },
      )
    }

    const jwtPayload = {
      sub:      user.id,
      email:    user.email,
      role:     user.role,
      userType: user.userType,
    }

    const newAccessToken = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret())

    const newRefreshToken = await new SignJWT({ sub: user.id, type: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      // 7d (era 30d) — ver login/route.ts. Reduz a janela de um refresh roubado.
      .setExpirationTime("7d")
      .sign(secret())

    return NextResponse.json({
      data: {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
        // Não devolver isActive/deletedAt (campos internos usados só no guard
        // acima) no payload do cliente. Achado revisão s41 (segurança).
        user: {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          role:       user.role,
          userType:   user.userType,
          isVerified: user.isVerified,
          avatarUrl:  user.avatarUrl,
          city:       user.city,
          state:      user.state,
        },
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown"
    console.error("[POST /api/auth/mobile/refresh]", msg)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
