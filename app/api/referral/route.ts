/**
 * GET  /api/referral  — retorna código + stats do embaixador (ADR-022)
 * POST /api/referral  — gera código de indicação se ainda não existir
 *
 * Aceita Bearer JWT (app mobile) via resolveUserId — além de cookie NextAuth.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveUserId } from "@/lib/resolveUserId"
import { getOrCreateReferralCode } from "@/lib/referral"
import { getAmbassadorStats } from "@/lib/ambassador"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const stats = await getAmbassadorStats(userId)
  return NextResponse.json({ data: stats })
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  // Busca o nome do usuário para geração do prefixo do código de indicação.
  // getOrCreateReferralCode já retorna o código existente se o usuário já tiver um.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  const code = await getOrCreateReferralCode(userId, user?.name ?? "USER")
  return NextResponse.json({ data: { code } })
}
