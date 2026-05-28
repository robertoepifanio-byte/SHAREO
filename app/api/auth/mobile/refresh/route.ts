import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jwtVerify, SignJWT } from "jose"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

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
      const { payload: p } = await jwtVerify(refreshToken, secret())
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
      .setExpirationTime("30d")
      .sign(secret())

    return NextResponse.json({
      data: {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
        user,
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
