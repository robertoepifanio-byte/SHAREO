/**
 * GET  /api/referral  — retorna código + stats do usuário logado
 * POST /api/referral  — gera código se ainda não existir
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getOrCreateReferralCode, getReferralStats } from "@/lib/referral"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const stats = await getReferralStats(session.user.id)
  return NextResponse.json({ data: stats })
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const code = await getOrCreateReferralCode(session.user.id, session.user.name ?? "USER")
  return NextResponse.json({ data: { code } })
}
